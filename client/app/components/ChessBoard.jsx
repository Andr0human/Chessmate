import { Chess } from "chess.js";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { formatTime, getPieceSymbol, squareToAlgebraic } from "../lib/helpers";
import { socket } from "../services";

const ChessBoard = ({ gameOptions, roomId, isGameReady = true }) => {
  // State management
  const [game, setGame] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState(game.board());
  const [draggingPiece, setDraggingPiece] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [processingMove, setProcessingMove] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [squareSize, setSquareSize] = useState(100);

  // Refs
  const boardRef = useRef(null);
  const timerInterval = useRef(null);

  // Clock state
  const [clock, setClock] = useState({
    white: 0,
    black: 0,
    active: "white",
    upper: { side: "black", name: "" },
    lower: { side: "white", name: "" },
  });

  // Initialize game based on props
  useEffect(() => {
    if (!gameOptions) return;

    // Set initial board flip based on player side preference
    if (gameOptions.board.side === "black") {
      setBoardFlipped(true);
    }

    // Initialize timers if game has time control
    if (gameOptions.board?.timeControl > 0) {
      const timeInMs = gameOptions.board.timeControl * 60 * 1000;
      const sideUpper = gameOptions.board.side === "white" ? "black" : "white";
      const sideLower = gameOptions.board.side;

      setClock((prev) => ({
        ...prev,
        white: timeInMs,
        black: timeInMs,
        upper: {
          side: sideUpper,
          name: gameOptions.board.players[sideUpper],
        },
        lower: {
          side: sideLower,
          name: gameOptions.board.players[sideLower],
        },
      }));
    }
  }, [gameOptions]);

  // Handle timer
  useEffect(() => {
    if (!gameOptions.board?.timeControl || !isGameReady) return;

    // Clear any existing timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    // Start a new timer based on whose turn it is
    const activeColor = game.turn() === "w" ? "white" : "black";
    setClock((prev) => ({
      ...prev,
      active: activeColor,
    }));

    timerInterval.current = setInterval(() => {
      setClock((prev) => ({
        ...prev,
        [activeColor]: Math.max(0, prev[activeColor] - 1000),
      }));
    }, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [game.turn(), gameOptions.board?.timeControl, isGameReady]);

  // Handle game move
  const playMove = useCallback(
    (move) => {
      setBoardPosition(game.board());
      setSelectedSquare(null);
      setLegalMoves([]);
      setDraggingPiece(null);

      socket.emit("move_sent", JSON.stringify(move), roomId);

      // Add increment to player's time if provided
      if (gameOptions.board?.increment > 0) {
        const incrementMs = gameOptions.board.increment * 1000;
        const playerColor = move.color === "w" ? "white" : "black";

        setClock((prev) => ({
          ...prev,
          [playerColor]: prev[playerColor] + incrementMs,
        }));
      }
    },
    [game, gameOptions.board?.increment]
  );

  // Socket connection and move handling
  useEffect(() => {
    socket.on("move_received", (moveData) => {
      console.log("New move received:", moveData);

      // Parse the move from the received string
      const parsedMove = JSON.parse(moveData);

      // Attempt to make the move on the game state
      const moveResult = game.move(parsedMove);

      if (moveResult) {
        // If the move was successful, update the board position
        setBoardPosition(game.board());
      } else {
        console.error("Invalid move received:", parsedMove);
      }
    });

    // Clean up the socket listener on component unmount
    return () => {
      socket.off("move_received");
    };
  }, [game]);

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;

      // Set square size based on screen width
      if (width < 400) setSquareSize(48);
      else if (width < 640) setSquareSize(60);
      else if (width < 768) setSquareSize(70);
      else if (width < 1024) setSquareSize(80);
      else setSquareSize(100);
    };

    // Set initial dimensions
    updateDimensions();

    // Add event listener for window resize
    window.addEventListener("resize", updateDimensions);

    // Clean up event listener
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Flip the board
  const flipBoard = useCallback(() => {
    setBoardFlipped((prev) => !prev);

    setClock((prev) => ({
      ...prev,
      upper: { ...prev.lower },
      lower: { ...prev.upper },
    }));
  }, []);

  // Get legal moves for a piece at a specific square
  const getLegalMovesForSquare = useCallback(
    (square) => {
      const moves = game.moves({ square, verbose: true });
      return moves.map((move) => move.to);
    },
    [game]
  );

  // Handle piece click or touch
  const handlePieceSelect = useCallback(
    (piece, square) => {
      const turn = game.turn() === "w" ? "white" : "black";
      if (!isGameReady || turn !== gameOptions?.board?.side) return;

      // If the same piece is clicked again, deselect it
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Only select pieces that belong to the current player
      const currentTurn = game.turn();
      if (piece.color !== currentTurn) return;

      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
    },
    [game, getLegalMovesForSquare, selectedSquare, isGameReady]
  );

  // Handle square click to move selected piece
  const handleSquareClick = useCallback(
    (targetSquare) => {
      const turn = game.turn() === "w" ? "white" : "black";
      if (!isGameReady || turn !== gameOptions?.board?.side) return;

      // Prevent duplicate move processing
      if (processingMove) return;

      if (selectedSquare && legalMoves.includes(targetSquare)) {
        setProcessingMove(true);
        try {
          // Attempt to make the move
          const move = game.move({
            from: selectedSquare,
            to: targetSquare,
            promotion: "q", // Always promote to queen for simplicity
          });

          if (move) playMove(move);
        } catch (error) {
          console.error("Invalid move:", error);
        } finally {
          // Reset the processing flag
          setTimeout(() => {
            setProcessingMove(false);
          }, 100);
        }
      }
    },
    [game, legalMoves, playMove, processingMove, selectedSquare, isGameReady]
  );

  // Handle piece dragging start
  const handleDragStart = useCallback(
    (e, piece, square) => {
      const turn = game.turn() === "w" ? "white" : "black";
      if (!isGameReady || turn !== gameOptions?.board?.side) return;
      
      const currentTurn = game.turn();
      // Only allow dragging pieces of the current player's color
      if (piece.color !== currentTurn) return;

      setDraggingPiece({ piece, square });
      setSelectedSquare(square);
      setLegalMoves(getLegalMovesForSquare(square));
      e.dataTransfer.effectAllowed = "move";
    },
    [game, getLegalMovesForSquare, isGameReady]
  );

  // Handle dropping a piece
  const handleDrop = useCallback(
    (e, targetSquare) => {
      e.preventDefault();

      // Don't allow moves if game is not ready
      if (!isGameReady) return;

      if (!draggingPiece || processingMove) return;

      setProcessingMove(true);
      const { square: sourceSquare } = draggingPiece;

      try {
        // Attempt to make the move
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // Always promote to queen for simplicity
        });

        if (move) playMove(move);
      } catch (error) {
        console.error("Invalid move:", error);
      } finally {
        // Reset the processing flag after a short delay
        setTimeout(() => {
          setProcessingMove(false);
        }, 100);
      }
    },
    [draggingPiece, game, playMove, processingMove, isGameReady]
  );

  // Allow dropping
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Render chess pieces and squares
  const renderSquare = useCallback(
    (row, col) => {
      // Determine the true board coordinates based on flip state
      const boardRow = boardFlipped ? 7 - row : row;
      const boardCol = boardFlipped ? 7 - col : col;

      // Algebraic notation should match the displayed position
      const algebraicSquare = squareToAlgebraic(row, col, boardFlipped);

      // Colors alternate in a checkered pattern
      const isBlack = (row + col) % 2 === 1;

      // Get the piece from the internal board representation
      const piece = boardPosition[boardRow][boardCol];

      const isSelected = selectedSquare === algebraicSquare;
      const isLegalMove = legalMoves.includes(algebraicSquare);

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

          {/* Highlight for selected piece */}
          {isSelected && (
            <div className="absolute inset-0 bg-yellow-400 opacity-40 z-0"></div>
          )}

          {/* Highlight for legal moves */}
          {isLegalMove && !piece && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-1/3 h-1/3 rounded-full bg-gray-600 opacity-40"></div>
            </div>
          )}

          {/* Highlight for captures */}
          {isLegalMove && piece && (
            <div className="absolute inset-0 border-2 border-gray-600 opacity-80 z-10"></div>
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
                fontSize: `${squareSize * 0.7}px`,
                lineHeight: "1",
                color: piece.color === "w" ? "white" : "black",
                textShadow:
                  piece.color === "w" ? "0 0 1px black" : "0 0 1px white",
                transition: "transform 0.15s ease-in-out",
              }}
            >
              {getPieceSymbol(piece)}
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
    (position) => {
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
              {formatTime(clock[playerInfo.side])}
            </div>
          )}
        </div>
      );
    },
    [clock, gameOptions.board?.timeControl, isGameReady]
  );

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

        <button
          className={`px-4 py-2 bg-green-600 text-white rounded ${
            isGameReady ? "hover:bg-green-700" : "opacity-50 cursor-not-allowed"
          }`}
          disabled={!isGameReady}
        >
          Offer Draw
        </button>

        <button
          className={`px-4 py-2 bg-red-600 text-white rounded ${
            isGameReady ? "hover:bg-red-700" : "opacity-50 cursor-not-allowed"
          }`}
          disabled={!isGameReady}
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
              {isGameReady ? "In Progress" : "Waiting for opponent"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
