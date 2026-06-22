import { IGoRequest } from "./entities";

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

// Given a White-relative centipawn score, decide whether it encodes a forced
// mate and, if so, the signed mate distance in moves (+ = White mates, − = Black
// mates). Callers must pass an already White-relative score (the UCI score is
// side-to-move-relative and must be flipped first) so the sign is meaningful.
const deriveMate = (
  whiteCp: number
): { mate: boolean; mateIn: number | null } => {
  const mate = Math.abs(whiteCp) >= MATE_SCORE_THRESHOLD;
  const mateIn = mate
    ? Math.sign(whiteCp) *
      Math.ceil((VALUE_MATE - Math.abs(whiteCp)) / MATE_PLY_STEP / 2)
    : null;
  return { mate, mateIn };
};

// Parse one UCI `info` line streamed by `elsa` during a search (single_thread.cpp
// → emitUciInfo):
//   info depth <d> score cp <cp> nodes <n> time <ms> pv <lan> <lan> ...
// `cp` is raw centipawns from the SIDE-TO-MOVE's point of view (negamax) — the
// caller flips it to White-relative. Mate is encoded as a large `cp` near
// VALUE_MATE (elsa emits no "mate" token). `pv` is UCI long algebraic and the
// engine already excludes its quiescence tail, so it is a clean main line.
// Returns null for `info` lines without a usable depth+score (ignored upstream).
const parseUciInfoLine = (
  line: string
): { depth: number; scoreCp: number; nodes: number; pvLan: string[] } | null => {
  const tokens = line.split(/\s+/);
  let depth: number | null = null;
  let scoreCp: number | null = null;
  let nodes = 0;
  let pvLan: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "depth") {
      depth = Number(tokens[++i]);
    } else if (token === "nodes") {
      nodes = Number(tokens[++i]) || 0;
    } else if (token === "score" && tokens[i + 1] === "cp") {
      scoreCp = Number(tokens[i + 2]);
    } else if (token === "pv") {
      pvLan = tokens.slice(i + 1).filter(Boolean);
      break; // pv is always last; the rest of the line is moves
    }
  }

  if (depth === null || !Number.isInteger(depth) || depth <= 0) return null;
  if (scoreCp === null || !Number.isFinite(scoreCp)) return null;

  return { depth, scoreCp, nodes, pvLan };
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

export { parseEngineOutput, buildGoArgs, parseUciInfoLine, deriveMate };
