import { Star, Piece, Square, Side, ChessJsPiece } from "@/types";
import { FILES, PIECE_NAMES, RANKS } from "./constants";

export const formatTime = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Convert chess.js position to algebraic notation
export const squareToAlgebraic = (
  row: number,
  col: number,
  boardFlipped: boolean
): Square => {
  // If board is flipped, we need to invert the coordinates for algebraic notation
  const adjustedCol = boardFlipped ? 7 - col : col;
  const adjustedRow = boardFlipped ? 7 - row : row;

  return `${FILES[adjustedCol]}${RANKS[adjustedRow]}` as Square;
};

export const getPieceSymbol = (piece: ChessJsPiece): string => {
  if (!piece) {
    return "";
  }

  const color = piece.color === "w" ? "white" : "black";
  const type = PIECE_NAMES[piece.type as keyof typeof PIECE_NAMES];

  return `/pieces/${color}/${type}.webp`;
};

// Generate a random 6-character roomId
export const generateRoomId = (): string => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const inverseSide = (side: Side): Side => {
  return side === Side.white ? Side.black : Side.white;
};

export const generateStars = (numStars = 100): Star[] => {
  const newStars: Star[] = [];
  for (let i = 0; i < numStars; i++) {
    newStars.push({
      id: `star-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      animationDuration: `${Math.random() * 5 + 5}s`,
    });
  }
  return newStars;
};
