import { Socket } from "socket.io";
import logger from "../../lib/logger";
import { AdminMiddleware } from "../../lib/middlewares";
import ChessEngine from "./Engine";
import { IAnalysisUpdate } from "./entities";
import { deriveMate } from "./helpers";

// Live-analysis depth cap. The client offers [15, 20, 25, 30, 35, 40]; we
// re-clamp here so a crafted request can't drive the engine past MAX_DEPTH
// (40, types.h) or below 1. The engine's `go depth <d>` does NOT clamp to
// MAX_DEPTH itself (uci.cpp handleGo passes the parsed value straight into
// search), so this clamp is what keeps a request inside the ply-indexed table
// bounds — keep MAX_MAX_DEPTH == the engine's MAX_DEPTH, never above it.
// Default mirrors the client's default selection.
const DEFAULT_MAX_DEPTH = 20;
const MIN_MAX_DEPTH = 1;
const MAX_MAX_DEPTH = 40;

// A FEN is six space-separated fields; we don't fully validate chess legality
// here (the engine and the client's chess.js do that) — just reject obviously
// malformed input cheaply before spawning the engine.
const FEN_PATTERN = /^[1-8pnbrqkPNBRQK/]+ [wb] [KQkqA-Ha-h-]+ [a-h1-8-]+ \d+ \d+$/;

interface IAnalysisRequest {
  fen?: string;
  adminPass?: string;
  maxDepth?: number;
}

export default function registerEngineSocketHandlers(socket: Socket) {
  // At most one analysis runs per connection. A new request (or disconnect)
  // kills the previous child first — the server side of the client's debounced
  // latest-wins, and what stops orphaned searches from piling up.
  let current: { kill: () => void } | null = null;
  const killCurrent = () => {
    if (current) {
      current.kill();
      current = null;
    }
  };

  socket.on("request_analysis", (payload: IAnalysisRequest) => {
    const { fen, adminPass, maxDepth } = payload ?? {};

    // Analysis is admin-gated. Same secret/constant-time check as the REST
    // engine routes; fails closed when ADMIN_PASS is unset.
    if (!AdminMiddleware.verify(adminPass)) {
      socket.emit("analysis_error", {
        message: "Unauthorized",
        unauthorized: true,
      });
      return;
    }

    if (typeof fen !== "string" || !FEN_PATTERN.test(fen.trim())) {
      socket.emit("analysis_error", { message: "Invalid FEN" });
      return;
    }

    const cleanFen = fen.trim();
    const depthCap = Math.min(
      MAX_MAX_DEPTH,
      Math.max(MIN_MAX_DEPTH, Math.floor(Number(maxDepth)) || DEFAULT_MAX_DEPTH)
    );

    // UCI `info` reports a side-to-move-relative (negamax) score; flip it to
    // White-relative so the client keeps displaying it with no per-turn flip
    // (see search.h). The old table-parse path got this conversion for free;
    // the live path must do it here. Flipping by turn on the *client* was a past
    // bug that inverted Black-to-move evals — keep the flip on this side only.
    const sideToMove = cleanFen.split(/\s+/)[1] === "b" ? "b" : "w";
    const toWhite = (cp: number) => (sideToMove === "w" ? cp : -cp);

    // Supersede any in-flight search for this connection.
    killCurrent();

    // Remember the deepest update so the final `analysis_result` can re-send it
    // (the client uses that event purely to clear its "analyzing" state).
    let last: IAnalysisUpdate | null = null;

    try {
      const engine: ChessEngine = ChessEngine.getInstance();
      current = engine.analyzeStream(cleanFen, depthCap, {
        onInfo: ({ depth, scoreCp, nodes, nps, pvLan }) => {
          const whiteCp = toWhite(scoreCp);
          const update: IAnalysisUpdate = {
            fen: cleanFen,
            terminal: false,
            scoreCp: whiteCp,
            ...deriveMate(whiteCp),
            depth,
            nodes,
            nps,
            pvLan,
          };
          last = update;
          socket.emit("analysis_progress", update);
        },
        onDone: () => {
          const final: IAnalysisUpdate = last ?? {
            fen: cleanFen,
            terminal: false,
            scoreCp: 0,
            mate: false,
            mateIn: null,
            depth: 0,
            nodes: 0,
            nps: 0,
            pvLan: [],
          };
          socket.emit("analysis_result", final);
          current = null;
        },
        onError: (err) => {
          logger.error(
            `Analysis stream failed for fen "${cleanFen}": ${err.message}`
          );
          socket.emit("analysis_error", { message: "Engine failed to analyze" });
          current = null;
        },
      });
    } catch (error) {
      logger.error(`Analysis failed for fen "${cleanFen}": ${error}`);
      socket.emit("analysis_error", { message: "Engine failed to analyze" });
    }
  });

  // Don't leave a search running for a client that's gone.
  socket.on("disconnect", killCurrent);
}
