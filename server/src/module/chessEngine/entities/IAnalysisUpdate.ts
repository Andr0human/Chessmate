// One streaming analysis update, emitted by the `request_analysis` handler over
// the `analysis_progress` (one per completed search depth) and `analysis_result`
// (final, deepest) socket events. `fen` echoes the analyzed position so the
// client can drop updates that arrive after the position has moved on.
//
// `scoreCp`/`mateIn` are White-relative (+ = White better). UCI `info` reports a
// side-to-move-relative (negamax) score; the handler flips the sign for Black to
// preserve the client's no-per-turn-flip contract (see search.h). When `mate` is
// true, `mateIn` is the signed mate distance in moves (+ = White mates).
//
// `pvLan` is the principal variation in UCI long algebraic (e.g. "e2e4",
// "e7e8q"); the client converts it to SAN against the FEN, since the chess-rules
// authority is client-side (chess.js), not the server. `terminal` flags a
// position with no legal moves — emitted false here; the client detects terminal
// positions locally and never asks the engine to evaluate them.
interface IAnalysisUpdate {
  fen: string;
  terminal: boolean;
  scoreCp: number;
  mate: boolean;
  mateIn: number | null;
  depth: number;
  nodes: number;
  pvLan: string[];
}

export default IAnalysisUpdate;
