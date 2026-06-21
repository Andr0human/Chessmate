"use client";

import {
  DrawOfferModal,
  GameOverModal,
  PromotionModal,
} from "@/components/modals";
import {
  formatTime,
  getPieceSymbol,
  inverseSide,
  squareToAlgebraic,
} from "@/lib/helpers";
import { socket } from "@/services";
import {
  ChessJsMove,
  ChessJsPiece,
  DraggingPiece,
  GameOptions,
  Move,
  PieceType,
  Square,
  GameResult,
  MoveReceived,
  GameOverTimeout,
  GameWinner,
  DrawReason,
  Side,
} from "@/types";
import { Chess } from "chess.js";
import { DragEvent, useCallback, useEffect, useRef, useState } from "react";

interface ChessBoardProps {
  gameOptions: GameOptions;
  updateFen: (fen: string) => void;
  roomId: string | null;
  isGameReady: boolean;
  gameType: string;
}

const ChessBoard = ({
  gameOptions,
  updateFen,
  roomId,
  isGameReady = true,
  gameType,
}: ChessBoardProps) => {
  // State management
  const [game, setGame] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState<ChessJsPiece[][]>(
    game.board()
  );
  const [draggingPiece, setDraggingPiece] = useState<DraggingPiece | null>(
    null
  );
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [processingMove, setProcessingMove] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [squareSize, setSquareSize] = useState(100);
  const [playerSide, setPlayerSide] = useState<Side | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);

  // Promotion modal state
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);

  // Draw offer modal state
  const [showDrawOfferModal, setShowDrawOfferModal] = useState<boolean>(false);
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);

  // Game over state
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameWinner, setGameWinner] = useState<GameWinner | null>(null);

  // Refs
  const boardRef = useRef(null);
  // Mirror of gameOver so socket handlers (which close over a stale value) can
  // read the latest state without re-subscribing.
  const gameOverRef = useRef(false);

  // Clock state. `white`/`black` hold the authoritative remaining time (ms) at
  // the last server sync; `anchorAt` is the local `performance.now()` of that
  // sync. The active side's displayed time is derived as base − elapsed, so all
  // clients agree regardless of timer phase/throttling. See getDisplayedTime.
  const [clock, setClock] = useState({
    white: 60000,
    black: 60000,
    active: Side.white,
    anchorAt: 0,
    upper: { side: Side.black, name: "" },
    lower: { side: Side.white, name: "" },
  });
  // Bumped by a lightweight ticker purely to re-render the running clock.
  const [nowTick, setNowTick] = useState(0);

  // Remaining time (ms) to display for a side: the active side counts down from
  // its anchor; the idle side shows its stored base.
  const getDisplayedTime = useCallback(
    (side: Side): number => {
      const base = clock[side];
      if (clock.active === side && isGameReady && clock.anchorAt > 0) {
        return Math.max(0, base - (nowTick - clock.anchorAt));
      }
      return Math.max(0, base);
    },
    [clock, nowTick, isGameReady]
  );

  // Socket connection and move handling
  useEffect(() => {
    socket.on("move_received", (moveData: MoveReceived) => {
      const { move, board, players } = moveData;

      // Attempt to make the move on the game state
      const moveResult = game.move(move);

      if (moveResult) {
        // If the move was successful, update the board position
        setBoardPosition(game.board());
        updateFen(board.fen);

        // Update last move for highlighting
        setLastMove({
          from: moveResult.from,
          to: moveResult.to,
        });

        // Update player clocks with the latest time information from server
        if (players && board.timeControl > 0) {
          const whitePlayer = players.find(
            (player) => player.side === Side.white
          );
          const blackPlayer = players.find(
            (player) => player.side === Side.black
          );

          if (whitePlayer && blackPlayer) {
            setClock((prev) => ({
              ...prev,
              white: whitePlayer.timeLeft * 1000,
              black: blackPlayer.timeLeft * 1000,
              active: board.side as Side,
              anchorAt: performance.now(),
            }));
          }
        }
      } else {
        console.error("Invalid move received:", move);
      }
    });

    // Handle draw offer
    socket.on("draw_offered", (offeredBySocketId: string) => {
      // Find player who offered the draw
      const offeringPlayer = gameOptions.players.find(
        (player) => player.id === offeredBySocketId
      );

      setDrawOfferedBy(offeringPlayer?.name || "Opponent");
      setShowDrawOfferModal(true);
    });

    // Handle draw accepted
    socket.on("draw_accepted", () => {
      setGameResult("draw");
      setGameWinner(DrawReason.AGREEMENT as GameWinner);
      setGameOver(true);
      setShowDrawOfferModal(false);
    });

    // Handle draw rejected
    socket.on("draw_rejected", () => {
      // Just hide the modal for the player who offered the draw
      setShowDrawOfferModal(false);
    });

    // Handle resignation
    socket.on("game_resigned", (resignedSocketId: string) => {
      const resigningPlayer = gameOptions.players.find(
        (player) => player.id === resignedSocketId
      );

      if (resigningPlayer) {
        const resigningSide = resigningPlayer.side;
        const winningSide = inverseSide(resigningSide);

        setGameResult("resignation");
        setGameWinner(winningSide);
        setGameOver(true);
      }
    });

    // Authoritative flag-fall from the server (clock authority).
    socket.on("game_over_timeout", ({ winner }: GameOverTimeout) => {
      // Ignore if the game already ended (e.g. checkmate) — the server timer
      // may still fire late for the side that was to move.
      if (gameOverRef.current) {
        return;
      }
      setGameResult("timeout");
      setGameWinner(winner);
      setGameOver(true);
    });

    // Clean up the socket listeners on component unmount
    return () => {
      socket.off("move_received");
      socket.off("draw_offered");
      socket.off("draw_accepted");
      socket.off("draw_rejected");
      socket.off("game_resigned");
      socket.off("game_over_timeout");
    };
  }, [game, gameOptions.players]);

  // Keep the ref in sync so socket handlers see the latest game-over state.
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    if (gameOptions?.connection?.status === "playing") {
      const player = gameOptions.players.find(
        (player) => player.id === gameOptions.connection.mySocketId
      );

      if (!player) {
        console.error("Could not find player data for this connection");
        return;
      }

      setPlayerSide(player.side);
      setBoardFlipped(player.side === Side.black);

      const newGame = new Chess(gameOptions.board.fen);
      setGame(newGame);
      setBoardPosition(newGame.board());
      setLastMove(null);

      if (gameOptions.board?.timeControl > 0) {
        const sideLower = player.side;
        const sideUpper = inverseSide(player.side);

        const playerLower = gameOptions.players.find(
          (player) => player.side === sideLower
        );
        const playerUpper = gameOptions.players.find(
          (player) => player.side === sideUpper
        );

        const whitePlayer = gameOptions.players.find(
          (player) => player.side === Side.white
        );
        const blackPlayer = gameOptions.players.find(
          (player) => player.side === Side.black
        );

        const whiteTimeMs =
          whitePlayer && typeof whitePlayer.timeLeft === "number"
            ? Math.max(0, whitePlayer.timeLeft * 1000)
            : gameOptions.board.timeControl * 1000;

        const blackTimeMs =
          blackPlayer && typeof blackPlayer.timeLeft === "number"
            ? Math.max(0, blackPlayer.timeLeft * 1000)
            : gameOptions.board.timeControl * 1000;

        setClock((prev) => ({
          ...prev,
          white: whiteTimeMs,
          black: blackTimeMs,
          active: gameOptions.board.side as Side,
          anchorAt: performance.now(),
          upper: {
            side: sideUpper,
            name: playerUpper?.name || "Player 2",
          },
          lower: {
            side: sideLower,
            name: playerLower?.name || "Player 1",
          },
        }));
      }
    }
  }, [gameOptions?.connection?.status]);

  // Clock ticker: this only forces a re-render so the active side's derived
  // time (getDisplayedTime) updates. It never mutates the clock value itself —
  // the value comes from the server-anchored base minus real elapsed time, so
  // both clients stay in sync regardless of timer phase or tab throttling.
  useEffect(() => {
    if (!gameOptions.board?.timeControl || !isGameReady || gameOver) {
      return;
    }

    setNowTick(performance.now());
    const interval = setInterval(() => {
      setNowTick(performance.now());
    }, 200);

    return () => clearInterval(interval);
  }, [gameOptions.board?.timeControl, isGameReady, gameOver]);

  useEffect(() => {
    const player = gameOptions.players.find(
      (player) =>
        player.id === "computer" && player.side === gameOptions.board.side
    );

    if (player) {
      socket.emit("request_engine_move", roomId);
    }
  }, [gameOptions?.board?.side]);

  // Check for game over conditions
  const checkGameOver = useCallback(() => {
    // Already in a game over state
    if (gameOver) {
      return;
    }

    // Check for checkmate
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? Side.black : Side.white;
      setGameResult("checkmate");
      setGameWinner(winner);
      setGameOver(true);
      return;
    }

    // Check for draw scenarios
    if (game.isDraw()) {
      if (game.isStalemate()) {
        setGameWinner(DrawReason.STALEMATE);
      } else if (game.isInsufficientMaterial()) {
        setGameWinner(DrawReason.INSUFFICIENT_MATERIAL);
      } else if (game.isThreefoldRepetition()) {
        setGameWinner(DrawReason.THREEFOLD_REPETITION);
      } else if (game.isDraw()) {
        setGameWinner(DrawReason.FIFTY_MOVE_RULE);
      } else {
        setGameWinner(DrawReason.UNKNOWN);
      }

      setGameResult("draw");
      setGameOver(true);
      return;
    }

    // Timeouts are decided authoritatively by the server, which emits
    // `game_over_timeout`. The client no longer self-declares on a local clock.
  }, [game, gameOver]);

  // Check for game over after each move
  useEffect(() => {
    if (isGameReady) {
      checkGameOver();
    }
  }, [game.fen(), checkGameOver]);

  // Handle game move
  const playMove = useCallback(
    (move: ChessJsMove) => {
      setBoardPosition(game.board());
      setSelectedSquare(null);
      setLegalMoves([]);
      setDraggingPiece(null);

      // Set the last move for highlighting
      setLastMove({
        from: move.from as Square,
        to: move.to as Square,
      });

      socket.emit("move_sent", roomId, {
        move: move.san,
        socketId: socket.id,
        fenAfterMove: game.fen(),
      });

      // Optimistically flip the clock locally: settle the mover's running time
      // at this instant, apply increment, hand the active clock to the opponent,
      // and re-anchor. The server confirms these values on the opponent's reply.
      const moverColor = move.color === "w" ? Side.white : Side.black;
      const opponentColor = inverseSide(moverColor);
      const incrementMs = (gameOptions.board?.increment || 0) * 1000;

      setClock((prev) => {
        const now = performance.now();
        const moverElapsed =
          prev.active === moverColor && prev.anchorAt > 0
            ? Math.max(0, now - prev.anchorAt)
            : 0;
        const moverBase = Math.max(0, prev[moverColor] - moverElapsed) + incrementMs;

        return {
          ...prev,
          [moverColor]: moverBase,
          active: opponentColor,
          anchorAt: now,
        };
      });

      updateFen(game.fen());

      // Check for game over conditions
      checkGameOver();
    },
    [game, gameOptions.board?.increment, checkGameOver]
  );

  // Handle main menu
  const handleMainMenu = () => {
    // Navigate to main menu
    window.location.href = "/";
  };

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;

      // Set square size based on screen width
      if (width < 400) {
        setSquareSize(48);
      } else if (width < 640) {
        setSquareSize(60);
      } else if (width < 768) {
        setSquareSize(70);
      } else if (width < 1024) {
        setSquareSize(80);
      } else {
        setSquareSize(100);
      }
    };

    // Set initial dimensions
    updateDimensions();

    // Add event listener for window resize
    window.addEventListener("resize", updateDimensions);

    // Clean up event listener
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Flip the board
  const flipBoard = () => {
    setBoardFlipped((prev) => !prev);

    setClock((prev) => ({
      ...prev,
      upper: { ...prev.lower },
      lower: { ...prev.upper },
    }));
  };

  // Get legal moves for a piece at a specific square
  const getLegalMovesForSquare = useCallback(
    (square: Square) => {
      const moves = game.moves({ square, verbose: true });
      return moves.map((move) => move.to);
    },
    [game]
  );

  // Handle piece click or touch
  const handlePieceSelect = useCallback(
    (piece: ChessJsPiece, square: Square) => {
      const turn = game.turn() === "w" ? Side.white : Side.black;
      if (!isGameReady || turn !== playerSide) {
        return;
      }

      // If the same piece is clicked again, deselect it
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Only select pieces that belong to the current player
      const currentTurn = game.turn();
      if (piece?.color !== currentTurn) {
        return;
      }

      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
    },
    [game, getLegalMovesForSquare, selectedSquare, isGameReady]
  );

  // Handle promotion piece selection
  const handlePromotionSelect = useCallback(
    (pieceType: PieceType) => {
      if (!promotionMove) {
        return;
      }

      const { from, to } = promotionMove;
      try {
        // Attempt to make the move with the selected promotion piece
        const move = game.move({
          from,
          to,
          promotion: pieceType,
        });

        if (move) {
          playMove(move);
        }
      } catch (error) {
        console.error("Invalid promotion move:", error);
      } finally {
        setShowPromotionModal(false);
        setPromotionMove(null);
        setProcessingMove(false);
      }
    },
    [game, playMove, promotionMove]
  );

  // Handle closing the promotion modal without making a move
  const handleCancelPromotion = useCallback(() => {
    setShowPromotionModal(false);
    setPromotionMove(null);
    setProcessingMove(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setDraggingPiece(null);
  }, []);

  // Handle square click to move selected piece
  const handleSquareClick = useCallback(
    (targetSquare: Square) => {
      const turn = game.turn() === "w" ? Side.white : Side.black;
      if (!isGameReady || turn !== playerSide) {
        return;
      }

      // Prevent duplicate move processing
      if (processingMove) {
        return;
      }

      if (selectedSquare && legalMoves.includes(targetSquare)) {
        setProcessingMove(true);
        try {
          // Check if this is a pawn promotion move
          const sourceSquare = selectedSquare;
          const piece = game.get(sourceSquare);
          const isPromotion =
            piece &&
            piece.type === "p" &&
            ((piece.color === "w" && targetSquare[1] === "8") ||
              (piece.color === "b" && targetSquare[1] === "1"));

          if (isPromotion) {
            // Store the move details and show the promotion modal
            setPromotionMove({ from: sourceSquare, to: targetSquare });
            setShowPromotionModal(true);
            return;
          }

          // Regular move
          const move = game.move({
            from: sourceSquare,
            to: targetSquare,
          });

          if (move) {
            playMove(move);
          }
        } catch (error) {
          console.error("Invalid move:", error);
        } finally {
          // Only reset processing if not showing the promotion modal
          if (!showPromotionModal) {
            setTimeout(() => {
              setProcessingMove(false);
            }, 100);
          }
        }
      }
    },
    [
      game,
      legalMoves,
      playMove,
      processingMove,
      selectedSquare,
      isGameReady,
      showPromotionModal,
    ]
  );

  // Handle piece dragging start
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, piece: ChessJsPiece, square: Square) => {
      const turn = game.turn() === "w" ? Side.white : Side.black;
      if (!isGameReady || turn !== playerSide) {
        return;
      }

      const currentTurn = game.turn();
      // Only allow dragging pieces of the current player's color
      if (piece?.color !== currentTurn) {
        return;
      }

      setDraggingPiece({ piece, square });
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
      e.dataTransfer.effectAllowed = "move";
    },
    [game, getLegalMovesForSquare, isGameReady]
  );

  // Handle dropping a piece
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, targetSquare: Square) => {
      e.preventDefault();

      // Don't allow moves if game is not ready
      if (!isGameReady) {
        return;
      }

      if (!draggingPiece || processingMove) {
        return;
      }

      setProcessingMove(true);
      const { square: sourceSquare } = draggingPiece;

      try {
        // Check if this is a pawn promotion move
        const piece = game.get(sourceSquare);
        const isPromotion =
          piece &&
          piece.type === "p" &&
          ((piece.color === "w" && targetSquare[1] === "8") ||
            (piece.color === "b" && targetSquare[1] === "1"));

        if (isPromotion) {
          // Store the move details and show the promotion modal
          setPromotionMove({ from: sourceSquare, to: targetSquare });
          setShowPromotionModal(true);
          return;
        }

        // Regular move (non-promotion)
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // Fallback, shouldn't be used due to check above
        });

        if (move) {
          playMove(move);
        }
      } catch (error) {
        console.error("Invalid move:", error);
      } finally {
        // Only reset processing if not showing the promotion modal
        if (!showPromotionModal) {
          setTimeout(() => {
            setProcessingMove(false);
          }, 100);
        }
      }
    },
    [
      draggingPiece,
      game,
      playMove,
      processingMove,
      isGameReady,
      showPromotionModal,
    ]
  );

  // Allow dropping
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Render chess pieces and squares
  const renderSquare = useCallback(
    (row: number, col: number) => {
      // Determine the true board coordinates based on flip state
      const boardRow = boardFlipped ? 7 - row : row;
      const boardCol = boardFlipped ? 7 - col : col;

      // Algebraic notation should match the displayed position
      const algebraicSquare = squareToAlgebraic(row, col, boardFlipped);

      // Colors alternate in a checkered pattern
      const isBlack = (row + col) % 2 === 1;

      // Get the piece from the internal board representation
      const piece: ChessJsPiece = boardPosition[boardRow][boardCol];

      const isSelected = selectedSquare === algebraicSquare;
      const isLegalMove = legalMoves.includes(algebraicSquare);

      // Check if this square is part of the last move
      const isLastMoveFrom = lastMove && lastMove.from === algebraicSquare;
      const isLastMoveTo = lastMove && lastMove.to === algebraicSquare;

      return (
        <div
          key={`${row}-${col}`}
          className={`flex items-center justify-center relative ${
            isBlack ? "bg-[#B58863]" : "bg-[#F0D9B5]"
          }`}
          style={{
            width: `${squareSize}px`,
            height: `${squareSize}px`,
          }}
          onClick={() => {
            // If this square has a piece that can be selected, let the piece handler handle it
            if (piece && piece.color === game.turn() && !isLegalMove) {
              return; // Let the piece click handler take care of this
            }
            // Otherwise handle as a destination square
            handleSquareClick(algebraicSquare);
          }}
          onDrop={(e) => handleDrop(e, algebraicSquare)}
          onDragOver={handleDragOver}
        >
          {/* Coordinate labels */}
          {col === 0 && (
            <div className="absolute top-0 left-0 text-xs p-0.5 opacity-60">
              {boardFlipped ? row + 1 : 8 - row}
            </div>
          )}
          {row === 7 && (
            <div className="absolute bottom-0 right-0 text-xs p-0.5 opacity-60">
              {
                ["a", "b", "c", "d", "e", "f", "g", "h"][
                  boardFlipped ? 7 - col : col
                ]
              }
            </div>
          )}

          {/* Highlight for last move - source square */}
          {isLastMoveFrom && (
            <div className="absolute inset-0 bg-amber-500 opacity-25 z-0 ring-2 ring-amber-500 ring-inset" />
          )}

          {/* Highlight for last move - destination square */}
          {isLastMoveTo && (
            <div className="absolute inset-0 bg-amber-500 opacity-25 z-0 ring-2 ring-amber-500 ring-inset" />
          )}

          {/* Highlight for selected piece */}
          {isSelected && (
            <div className="absolute inset-0 bg-yellow-400 opacity-40 z-0" />
          )}

          {/* Highlight for legal moves */}
          {isLegalMove && !piece && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-1/3 h-1/3 rounded-full bg-gray-600 opacity-40" />
            </div>
          )}

          {/* Highlight for captures */}
          {isLegalMove && piece && (
            <div className="absolute inset-0 border-2 border-gray-600 opacity-80 z-10" />
          )}

          {/* Chess piece */}
          {piece && (
            <div
              className={`chess-piece cursor-grab z-20 ${
                isSelected ? "scale-110" : ""
              }`}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, piece, algebraicSquare)}
              onClick={(e) => {
                e.stopPropagation(); // Stop event from reaching the square
                if (isLegalMove) {
                  // This is a capture move
                  handleSquareClick(algebraicSquare);
                } else {
                  // This is selecting a piece
                  handlePieceSelect(piece, algebraicSquare);
                }
              }}
              style={{
                transition: "transform 0.15s ease-in-out",
                width: `${squareSize * 0.8}px`,
                height: `${squareSize * 0.8}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={getPieceSymbol(piece)}
                alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
                draggable="false"
              />
            </div>
          )}
        </div>
      );
    },
    [
      boardFlipped,
      boardPosition,
      game,
      handleDragOver,
      handleDragStart,
      handleDrop,
      handlePieceSelect,
      handleSquareClick,
      legalMoves,
      selectedSquare,
      squareSize,
      lastMove,
    ]
  );

  // Render the entire board
  const renderBoard = useCallback(() => {
    const squares = [];

    for (let row = 0; row < 8; row++) {
      const rowSquares = [];
      for (let col = 0; col < 8; col++) {
        rowSquares.push(renderSquare(row, col));
      }
      squares.push(
        <div key={row} className="flex">
          {rowSquares}
        </div>
      );
    }

    return squares;
  }, [renderSquare]);

  // Render player info with timer
  const renderPlayerInfo = useCallback(
    (position: "upper" | "lower") => {
      const isUpper = position === "upper";
      const playerInfo = isUpper ? clock.upper : clock.lower;

      return (
        <div className="flex justify-between items-center mb-2">
          <div className="bg-black bg-opacity-60 py-2 px-4 rounded text-white text-xl font-medium">
            {playerInfo.name}
          </div>
          {gameOptions.board?.timeControl > 0 && (
            <div
              className={`timer text-3xl font-mono font-bold rounded py-1 px-4 ${
                clock.active === playerInfo.side && isGameReady
                  ? "bg-black bg-opacity-70 text-white animate-pulse"
                  : "bg-black bg-opacity-50 text-white"
              }`}
            >
              {formatTime(getDisplayedTime(playerInfo.side))}
            </div>
          )}
        </div>
      );
    },
    [clock, getDisplayedTime, gameOptions.board?.timeControl, isGameReady]
  );

  // Handle draw offer acceptance
  const handleAcceptDraw = useCallback(() => {
    socket.emit("accept_draw", roomId);
    setShowDrawOfferModal(false);
    setGameResult("draw");
    setGameWinner(DrawReason.AGREEMENT);
    setGameOver(true);
  }, [roomId]);

  // Handle draw offer rejection
  const handleRejectDraw = useCallback(() => {
    socket.emit("reject_draw", roomId);
    setShowDrawOfferModal(false);
  }, [roomId]);

  // Handle offering a draw
  const handleOfferDraw = useCallback(() => {
    socket.emit("offer_draw", roomId);
  }, [roomId]);

  // Handle resignation
  const handleResign = useCallback(() => {
    const resigningSide = playerSide;
    const winningSide = inverseSide(resigningSide as Side);
    setGameResult("resignation");
    setGameWinner(winningSide);
    setGameOver(true);
    socket.emit("resign_game", roomId);
  }, [playerSide, roomId]);

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="chess-game-container">
        {/* Black player timer and name */}
        {renderPlayerInfo("upper")}

        {/* ChessBoard */}
        <div
          ref={boardRef}
          className="chess-board border-4 border-gray-800 shadow-xl rounded-sm overflow-hidden"
        >
          {renderBoard()}
        </div>

        {/* White player timer and name */}
        {renderPlayerInfo("lower")}
      </div>

      <div className="game-controls flex flex-row xl:flex-col gap-4 justify-center mt-4 xl:mt-0">
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={flipBoard}
        >
          Flip Board
        </button>

        {gameType == "multiplayer" && (
          <button
            className={`px-4 py-2 bg-green-600 text-white rounded ${
              isGameReady
                ? "hover:bg-green-700"
                : "opacity-50 cursor-not-allowed"
            }`}
            disabled={!isGameReady || gameOver}
            onClick={handleOfferDraw}
          >
            Offer Draw
          </button>
        )}

        <button
          className={`px-4 py-2 bg-red-600 text-white rounded ${
            isGameReady ? "hover:bg-red-700" : "opacity-50 cursor-not-allowed"
          }`}
          disabled={!isGameReady || gameOver}
          onClick={handleResign}
        >
          Resign
        </button>

        <div className="mt-0 xl:mt-4 hidden xl:block">
          <h3 className="font-bold mb-2 text-white">Game Info</h3>
          <div className="text-sm text-gray-300">
            <p>Time Control: {gameOptions.board?.timeControl || "No"} min</p>
            {gameOptions.board?.increment > 0 && (
              <p>Increment: {gameOptions.board.increment} sec</p>
            )}
            <p>
              Game Status:{" "}
              {gameOver
                ? "Game Over"
                : isGameReady
                ? "In Progress"
                : "Waiting for opponent"}
            </p>
          </div>
        </div>
      </div>

      <PromotionModal
        isOpen={showPromotionModal}
        onClose={handleCancelPromotion}
        onSelectPiece={handlePromotionSelect}
        playerColor={playerSide as Side}
      />

      <GameOverModal
        isOpen={gameOver}
        result={gameResult as GameResult}
        winner={gameWinner}
        onMainMenu={handleMainMenu}
      />

      <DrawOfferModal
        isOpen={showDrawOfferModal}
        onAccept={handleAcceptDraw}
        onReject={handleRejectDraw}
        opponentName={drawOfferedBy as string}
      />
    </div>
  );
};

export default ChessBoard;
