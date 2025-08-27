export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export type Square = `${File}${Rank}`;

export type Side = "white" | "black";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export type PieceName =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

export type PieceSymbol = "♟" | "♞" | "♝" | "♜" | "♛" | "♚";

export interface PieceNameMapping {
  [key: string]: PieceName;
  p: "pawn";
  n: "knight";
  b: "bishop";
  r: "rook";
  q: "queen";
  k: "king";
}

export interface Piece {
  type: PieceType;
  color: Side;
  square?: Square;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  capture?: PieceType;
  castle?: "kingside" | "queenside";
  enPassant?: Square;
}

export interface ChessJsMove {
  color: "w" | "b";
  from: string;
  to: string;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  before: string;
  after: string;
  flags: string;
  lan: string;
  san: string;
}

export type FENString = string;
