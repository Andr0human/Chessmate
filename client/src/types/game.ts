import { Side, FENString } from "@/types/chess";
import { DifficultyLevel } from "@/types/difficulty";

export interface Player {
  id: string | null;
  name: string;
  side: Side;
  timeLeft: number;
}

export interface BoardState {
  side: Side | "random";
  timeControl: number;
  increment: number;
  fen: FENString;
  difficulty: DifficultyLevel;
}

export interface ConnectionState {
  roomId: string | null;
  mySocketId: string | null;
  status: GameStatus;
}

export type GameStatus = "waiting" | "playing" | "ended" | "";

export interface GameOptions {
  board: BoardState;
  connection: ConnectionState;
  players: [Player, Player];
}

export interface GameState extends GameOptions {
  currentPlayer?: Side;
  moveHistory?: string[];
  isGameOver?: boolean;
  winner?: Side | "draw";
}

export enum DrawReason {
  AGREEMENT = "agreement",
  STALEMATE = "stalemate",
  INSUFFICIENT_MATERIAL = "insufficient",
  THREEFOLD_REPETITION = "threefold",
  FIFTY_MOVE_RULE = "fifty",
  UNKNOWN = "unknown",
}

export type GameWinner = "white" | "black" | DrawReason;

export type GameResult = "checkmate" | "timeout" | "draw" | "resignation";
