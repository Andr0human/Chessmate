import { Socket } from "socket.io";
import logger from "../../lib/logger";
import { AdminMiddleware } from "../../lib/middlewares";
import ChessEngine from "./Engine";

// Default search budget (seconds) for an analysis request. Kept short because
// analysis auto-runs on every position change on the client, so each request
// must stay snappy.
const DEFAULT_ANALYSIS_TIME = 1.2;
const MAX_ANALYSIS_TIME = 5;

// A FEN is six space-separated fields; we don't fully validate chess legality
// here (the engine and the client's chess.js do that) — just reject obviously
// malformed input cheaply before spawning the engine.
const FEN_PATTERN = /^[1-8pnbrqkPNBRQK/]+ [wb] [KQkqA-Ha-h-]+ [a-h1-8-]+ \d+ \d+$/;

interface IAnalysisRequest {
  fen?: string;
  adminPass?: string;
  searchSeconds?: number;
}

export default function registerEngineSocketHandlers(socket: Socket) {
  socket.on("request_analysis", async (payload: IAnalysisRequest) => {
    const { fen, adminPass, searchSeconds } = payload ?? {};

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

    const time = Math.min(
      MAX_ANALYSIS_TIME,
      Math.max(0.05, Number(searchSeconds) || DEFAULT_ANALYSIS_TIME)
    );

    try {
      const engine: ChessEngine = ChessEngine.getInstance();
      const result = await engine.analyze(fen.trim(), time);

      // Echo the analyzed FEN so the client can discard stale results that
      // arrive after the position has already changed.
      socket.emit("analysis_result", { fen: fen.trim(), ...result });
    } catch (error) {
      logger.error(`Analysis failed for fen "${fen}": ${error}`);
      socket.emit("analysis_error", { message: "Engine failed to analyze" });
    }
  });
}
