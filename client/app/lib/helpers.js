import { FILES, PIECE_SYMBOLS, RANKS } from "./constants";

export const formatTime = (timeMs) => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Convert chess.js position to algebraic notation
export const squareToAlgebraic = (row, col, boardFlipped) => {
  // If board is flipped, we need to invert the coordinates for algebraic notation
  const adjustedCol = boardFlipped ? 7 - col : col;
  const adjustedRow = boardFlipped ? 7 - row : row;

  return FILES[adjustedCol] + RANKS[adjustedRow];
};

export const getPieceSymbol = (piece) => {
  if (!piece) return null;

  return PIECE_SYMBOLS[piece.type] || "";
};

// Generate a random 6-character roomId
export const generateRoomId = () => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateBoardOptions = ({ side, timeControl, increment }) => {
  const startingSide =
    side === "random" ? (Math.random() < 0.5 ? "white" : "black") : side;

  const options = {
    side: startingSide,
    timeControl: parseInt(timeControl),
    players: {
      white: startingSide === "white" ? "Player1" : "Player2",
      black: startingSide === "black" ? "Player1" : "Player2",
    },
  };

  if (increment) {
    options.increment = parseInt(increment);
  }

  return options;
};

export const generateStars = (numStars = 100) => {
  const newStars = [];
  for (let i = 0; i < numStars; i++) {
    newStars.push({
      id: i,
      left: `${Math.random() * numStars}%`,
      top: `${Math.random() * numStars}%`,
      size: `${Math.random() * 2 + 1}px`,
      animationDuration: `${Math.random() * 5 + 5}s`,
    });
  }
  return newStars;
};
