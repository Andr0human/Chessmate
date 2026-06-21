// Result of an engine analysis of a single position, parsed from `elsa go`.
// `scoreCp` is centipawns, White-relative / absolute (+ = White better): the
// engine already converts its negamax score to White's POV before printing
// (search.h), so the client displays it directly with no per-turn flip. When
// `mate` is true, `mateIn` is the signed mate distance in moves (positive =
// White mates, negative = Black mates). `terminal` flags a position with no
// legal moves (checkmate/stalemate), where there is nothing to evaluate.
interface IAnalysisResult {
  terminal: boolean;
  scoreCp: number;
  mate: boolean;
  mateIn: number | null;
  depth: number;
  nodes: number;
  bestMove: string | null;
  pv: string[];
}

export default IAnalysisResult;
