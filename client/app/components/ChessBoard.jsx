import { Chess } from "chess.js";
import React, { useEffect, useRef, useState } from "react";
import { socket } from "../services";

const ChessBoard = ({ gameOptions }) => {
  const [game, setGame] = useState(new Chess());
  const [draggingPiece, setDraggingPiece] = useState(null);
  const [boardPosition, setBoardPosition] = useState(game.board());
  const [squareSize, setSquareSize] = useState(100);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [processingMove, setProcessingMove] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const boardRef = useRef(null);
  const timerInterval = useRef(null);
  const [clock, setClock] = useState({
    white: 0,
    black: 0,
    active: "white",
    upper: { side: "black", name: "" },
    lower: { side: "white", name: "" },
  });

  // Initialize game based on props
  useEffect(() => {
    if (gameOptions) {
      // Set initial board flip based on player side preference
      if (gameOptions.side === "black") {
        setBoardFlipped(true);
      }

      // Initialize timers if game has time control
      if (gameOptions.timeControl > 0) {
        const timeInMs = gameOptions.timeControl * 60 * 1000;
        const sideUpper = gameOptions.side == "white" ? "black" : "white";
        const sideLower = gameOptions.side;

        setClock((prev) => ({
          ...prev,
          white: timeInMs,
          black: timeInMs,
          upper: {
            side: sideUpper,
            name: gameOptions.players[sideUpper],
          },
          lower: {
            side: sideLower,
            name: gameOptions.players[sideLower],
          },
        }));
      }
    }
  }, [gameOptions]);

  // Handle timer
  useEffect(() => {
    // Only start timer if game has time control
    if (gameOptions?.timeControl > 0) {
      // Clear any existing timer
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      // Start a new timer based on whose turn it is
      timerInterval.current = setInterval(() => {
        if (clock.active === "white") {
          setClock((prev) => ({
            ...prev,
            white: Math.max(0, prev.white - 1000),
          }));
        } else {
          setClock((prev) => ({
            ...prev,
            black: Math.max(0, prev.black - 1000),
          }));
        }
      }, 1000);

      setClock((prev) => ({
        ...prev,
        active: game.turn() === "w" ? "white" : "black",
      }));
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [game.turn(), gameOptions?.timeControl]);

  useEffect(() => {
    // Set up socket listeners
    socket.on("connect", () => {
      console.log("Connected to server", socket.id);
    });

    socket.on("received-move", (move) => {
      console.log("New move received:", move);

      // Parse the move from the received string
      const parsedMove = JSON.parse(move);

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
      socket.off("received-move");
      socket.off("connect");
    };
  }, []); // Empty dependency array to run only on mount and unmount

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
    setBoardFlipped(!boardFlipped);

    const newClock = {
      ...clock,
      upper: {
        side: clock.lower.side,
        name: clock.lower.name,
      },
      lower: {
        side: clock.upper.side,
        name: clock.upper.name,
      },
    };

    setClock(newClock);
  };

  // Format time for display
  const formatTime = (timeMs) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get legal moves for a piece at a specific square
  const getLegalMovesForSquare = (square) => {
    const moves = game.moves({ square, verbose: true });
    return moves.map((move) => move.to);
  };

  // Handle piece click or touch
  const handlePieceSelect = (piece, square) => {
    // If the same piece is clicked again, deselect it
    if (selectedPiece === square) {
      setSelectedPiece(null);
      setLegalMoves([]);
      return;
    }

    // Only select pieces that belong to the current player
    const currentTurn = game.turn();
    if (piece.color !== currentTurn) {
      return;
    }

    setSelectedPiece(square);

    // Get all legal moves for this piece
    const moves = getLegalMovesForSquare(square);
    setLegalMoves(moves);
  };

  // Handle square click to move selected piece
  const handleSquareClick = (targetSquare) => {
    // Prevent duplicate move processing
    if (processingMove) return;

    if (selectedPiece && legalMoves.includes(targetSquare)) {
      setProcessingMove(true);

      try {
        // Attempt to make the move
        const move = game.move({
          from: selectedPiece,
          to: targetSquare,
          promotion: "q", // Always promote to queen for simplicity
        });

        if (move) {
          // If successful, update the board
          setBoardPosition(game.board());
          // Clear selection
          setSelectedPiece(null);
          setLegalMoves([]);

          console.log("played-move", move);
          socket.emit("played-move", JSON.stringify(move));

          // Switch active timer when turn changes
          setClock({
            ...clock,
            active: game.turn() === "w" ? "white" : "black",
          });

          // Add increment to player's time if provided
          if (gameOptions?.increment > 0) {
            const incrementMs = gameOptions.increment * 1000;
            if (move.color === "w") {
              setClock((prev) => ({
                ...prev,
                white: prev.white + incrementMs,
              }));
            } else {
              setClock((prev) => ({
                ...prev,
                black: prev.black + incrementMs,
              }));
            }
          }
        }
      } catch (error) {
        console.error("Invalid move:", error);
      } finally {
        // Reset the processing flag
        setTimeout(() => {
          setProcessingMove(false);
        }, 100);
      }
    }
  };

  // Handle piece dragging start
  const handleDragStart = (e, piece, square) => {
    // Only allow dragging pieces of the current player's color
    const currentTurn = game.turn();
    if (piece.color !== currentTurn) return;

    setDraggingPiece({ piece, square });
    setSelectedPiece(square);
    setLegalMoves(getLegalMovesForSquare(square));
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle dropping a piece
  const handleDrop = (e, targetSquare) => {
    e.preventDefault();
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

      if (move) {
        // If successful, update the board
        setBoardPosition(game.board());

        // Switch active timer when turn changes
        setClock((prev) => ({
          ...prev,
          active: game.turn() === "w" ? "white" : "black",
        }));

        // Add increment to player's time if provided
        if (gameOptions?.increment > 0) {
          const incrementMs = gameOptions.increment * 1000;
          if (move.color === "w") {
            setClock((prev) => ({ ...prev, white: prev.white + incrementMs }));
          } else {
            setClock((prev) => ({ ...prev, black: prev.black + incrementMs }));
          }
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
    } finally {
      setDraggingPiece(null);
      setSelectedPiece(null);
      setLegalMoves([]);

      // Reset the processing flag after a short delay
      setTimeout(() => {
        setProcessingMove(false);
      }, 100);
    }
  };

  // Allow dropping
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Convert chess.js position to algebraic notation
  const squareToAlgebraic = (row, col) => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

    // If board is flipped, we need to invert the coordinates for algebraic notation
    const adjustedCol = boardFlipped ? 7 - col : col;
    const adjustedRow = boardFlipped ? 7 - row : row;

    return files[adjustedCol] + ranks[adjustedRow];
  };

  // Get piece Unicode symbol
  const getPieceSymbol = (piece) => {
    if (!piece) return null;

    const symbols = {
      p: "♟",
      n: "♞",
      b: "♝",
      r: "♜",
      q: "♛",
      k: "♚",
      P: "♙",
      N: "♘",
      B: "♗",
      R: "♖",
      Q: "♕",
      K: "♔",
    };

    return symbols[piece.type] || "";
  };

  // Render board with a single loop
  const renderBoard = () => {
    const squares = [];

    // For each row (top to bottom in visual display)
    for (let row = 0; row < 8; row++) {
      const rowSquares = [];

      // For each column (left to right in visual display)
      for (let col = 0; col < 8; col++) {
        // Determine the true board coordinates based on flip state
        const boardRow = boardFlipped ? 7 - row : row;
        const boardCol = boardFlipped ? 7 - col : col;

        // Algebraic notation should match the displayed position
        const algebraicSquare = squareToAlgebraic(row, col);

        // Colors alternate in a checkered pattern
        // This should be based on visual coordinates, not board coordinates
        const isBlack = (row + col) % 2 === 1;

        // Get the piece from the internal board representation
        const piece = boardPosition[boardRow][boardCol];

        const isSelected = selectedPiece === algebraicSquare;
        const isLegalMove = legalMoves.includes(algebraicSquare);

        rowSquares.push(
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
            {/* Coordinate labels - these should always be in same positions visually */}
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
      }

      squares.push(
        <div key={row} className="flex">
          {rowSquares}
        </div>
      );
    }

    return squares;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      <div className="chess-game-container">
        {/* Black player timer and name */}
        <div className="flex justify-between items-center mb-2">
          <div className="bg-black bg-opacity-60 py-2 px-4 rounded text-white text-xl font-medium">
            {clock.upper.name}
          </div>
          {gameOptions?.timeControl > 0 && (
            <div
              className={`timer black-timer text-3xl font-mono font-bold rounded py-1 px-4 ${
                clock.active === clock.upper.side
                  ? "bg-black bg-opacity-70 text-white animate-pulse"
                  : "bg-black bg-opacity-50 text-white"
              }`}
            >
              {formatTime(clock[clock.upper.side])}
            </div>
          )}
        </div>
        {/* ChessBoard */}
        <div
          ref={boardRef}
          className="chess-board border-4 border-gray-800 shadow-xl rounded-sm overflow-hidden"
        >
          {renderBoard()}
        </div>
        {/* White player timer and name */}
        <div className="flex justify-between items-center mt-2">
          <div className="bg-black bg-opacity-60 py-2 px-4 rounded text-white text-xl font-medium">
            {clock.lower.name}
          </div>
          {gameOptions?.timeControl > 0 && (
            <div
              className={`timer white-timer text-3xl font-mono font-bold rounded py-1 px-4 ${
                clock.active === clock.lower.side
                  ? "bg-black bg-opacity-70 text-white animate-pulse"
                  : "bg-black bg-opacity-50 text-white"
              }`}
            >
              {formatTime(clock[clock.lower.side])}
            </div>
          )}
        </div>
      </div>

      <div className="game-controls flex flex-row xl:flex-col gap-4 justify-center mt-4 xl:mt-0">
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={flipBoard}
        >
          Flip Board
        </button>

        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Offer Draw
        </button>

        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Resign
        </button>

        <div className="mt-0 xl:mt-4 hidden xl:block">
          <h3 className="font-bold mb-2 text-white">Game Info</h3>
          <div className="text-sm text-gray-300">
            <p>Difficulty: {gameOptions?.difficulty || "N/A"}</p>
            <p>Time Control: {gameOptions?.timeControl || "No"} min</p>
            {gameOptions?.increment > 0 && (
              <p>Increment: {gameOptions.increment} sec</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
