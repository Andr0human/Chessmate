import type { Move, Side } from "./chess";
import type { BoardState, Player } from "./game";

interface MoveReceived {
  move: string;
  board: BoardState;
  players: Player[];
}

interface MoveSent {
  move: Move;
}

// Authoritative flag-fall emitted by the server when a player's clock hits 0.
interface GameOverTimeout {
  winner: Side;
  loser: Side;
}

// Engine analysis of a position (server `analysis_result`). `fen` echoes the
// analyzed position so the client can drop stale results. `scoreCp` is
// centipawns, White-relative / absolute (+ = White better) — the engine already
// converts to White's POV before printing, so the client uses it directly.
interface AnalysisResult {
  fen: string;
  terminal: boolean;
  scoreCp: number;
  mate: boolean;
  mateIn: number | null;
  depth: number;
  nodes: number;
  nps: number;
  bestMove: string | null;
  pv: string[];
}

// Live wire payload for the streaming analysis events `analysis_progress` (one
// per completed search depth) and `analysis_result` (final, deepest). Same shape
// as AnalysisResult except the PV is `pvLan` — UCI long algebraic (e.g. "e2e4",
// "e7e8q") — which the page converts to the SAN `pv`/`bestMove` of AnalysisResult
// by replaying against the analyzed FEN (the server isn't the rules authority).
// `scoreCp`/`mateIn` are already White-relative (the server flips the engine's
// side-to-move-relative score before emitting).
interface AnalysisUpdate {
  fen: string;
  terminal: boolean;
  scoreCp: number;
  mate: boolean;
  mateIn: number | null;
  depth: number;
  nodes: number;
  nps: number;
  pvLan: string[];
}

// Server `analysis_error`. `unauthorized` distinguishes a failed admin check
// (re-show the password gate) from other failures.
interface AnalysisError {
  message: string;
  unauthorized?: boolean;
}

export type {
  GameOverTimeout,
  MoveReceived,
  MoveSent,
  AnalysisResult,
  AnalysisUpdate,
  AnalysisError,
};
