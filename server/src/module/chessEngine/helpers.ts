import { IAnalysisResult, IGoRequest } from "./entities";

const parseEngineOutput = (output: string): string[] => {
  const lines: string[] = output.split("\n");
  const engineOutput: string[] = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return engineOutput;
};

// Mirrors VALUE_MATE in the engine (server/engine/src/types.h). Mate scores are
// VALUE_MATE minus a per-ply offset (20 cp/ply, see search_utils.cpp), so any
// |score| near VALUE_MATE means a forced mate was found rather than a material
// evaluation.
const VALUE_MATE = 16000;
const MATE_SCORE_THRESHOLD = VALUE_MATE - 500;
const MATE_PLY_STEP = 20;

// Parse the human-readable table printed by `elsa go` (single_thread.cpp →
// showLastDepthResult). Each completed depth prints a row shaped:
//   | <time> | <depth> | <score> | <nodes> | <qnodes> | <pv...>
// We take the LAST such row (deepest completed iteration). `score` is in pawns
// and is White-relative / absolute (+ = White better) — the engine converts the
// negamax score with `eval * (2*side-1)` before printing (search.h), so the
// client can display it directly with no per-turn flip. The PV is space-separated
// SAN with a trailing quiescence segment wrapped in ( ... ) that we drop (not
// part of the real principal variation). Returns a terminal marker when the
// position has no legal moves (checkmate/stalemate), where it emits no table rows.
const parseAnalysisOutput = (lines: string[]): IAnalysisResult => {
  if (lines.some((line) => line.includes("no legal moves"))) {
    return {
      terminal: true,
      scoreCp: 0,
      mate: false,
      mateIn: null,
      depth: 0,
      nodes: 0,
      bestMove: null,
      pv: [],
    };
  }

  let lastRow: string[] | null = null;
  for (const line of lines) {
    if (!line.includes("|")) continue;

    // Drop the leading empty cell from the leading "| " delimiter, then trim.
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, idx) => idx > 0);

    // A data row has a numeric depth (col 2) and numeric score (col 3); the
    // header row ("Depth"/"Score") and TT/summary lines fail this check.
    const depth = Number(cells[1]);
    const score = Number(cells[2]);
    if (Number.isInteger(depth) && depth > 0 && Number.isFinite(score)) {
      lastRow = cells;
    }
  }

  if (!lastRow) {
    return {
      terminal: false,
      scoreCp: 0,
      mate: false,
      mateIn: null,
      depth: 0,
      nodes: 0,
      bestMove: null,
      pv: [],
    };
  }

  const depth = Number(lastRow[1]);
  const scorePawns = Number(lastRow[2]);
  const nodes = Number(lastRow[3]) || 0;
  const scoreCp = Math.round(scorePawns * 100);

  // PV cell: keep main-line SAN only, stopping at the quiescence parenthetical.
  const pvCell = lastRow[5] ?? "";
  const pv: string[] = [];
  for (const token of pvCell.split(/\s+/)) {
    if (!token || token.startsWith("(")) break;
    pv.push(token);
  }

  const mate = Math.abs(scoreCp) >= MATE_SCORE_THRESHOLD;
  const mateIn = mate
    ? Math.sign(scoreCp) *
      Math.ceil((VALUE_MATE - Math.abs(scoreCp)) / MATE_PLY_STEP / 2)
    : null;

  return {
    terminal: false,
    scoreCp,
    mate,
    mateIn,
    depth,
    nodes,
    bestMove: pv[0] ?? null,
    pv,
  };
};

// Build the argv array for `elsa go ...` (no shell). Each element becomes a
// distinct argv token, so space-containing values like the FEN are passed
// verbatim with no shell interpretation — see execFile in Engine.ts.
const buildGoArgs = (options: IGoRequest): string[] => {
  const args: string[] = ["go"];

  for (const [key, value] of Object.entries(options)) {
    if (key === "debug" && value) {
      args.push("debug");
    } else if (key === "fen" && value) {
      args.push("fen", String(value));
    } else if (value) {
      args.push(key, String(value));
    }
  }

  return args;
};

export { parseEngineOutput, buildGoArgs, parseAnalysisOutput };
