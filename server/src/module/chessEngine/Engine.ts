import { execFile, spawn } from "child_process";
import fs from "fs";
import path from "path";
import readline from "readline";
import { promisify } from "util";
import logger from "../../lib/logger";
import { IGoRequest } from "./entities";
import { buildGoArgs, parseEngineOutput, parseUciInfoLine } from "./helpers";

// execFile (no shell): args are passed as an array, so client-controlled values
// like the FEN can never be interpreted as shell syntax — closes the command
// injection / RCE hole that `exec` with string interpolation had.
const execFileP = promisify(execFile);

// The only difficulties elsa recognizes (task.cpp:setParamswithDifficulty).
// Anything else is coerced to the default so unvalidated input can't reach the
// engine — defense in depth on top of execFile.
export const VALID_DIFFICULTIES = new Set([
  "beginner",
  "easy",
  "medium",
  "hard",
  "expert",
]);

class ChessEngine {
  private static instance: ChessEngine;
  private enginePath: string;

  private constructor() {
    // Check which executable to use based on OS
    const isWindows = process.platform === "win32";
    this.enginePath = isWindows
      ? path.join(__dirname, "../../../public", "elsa.exe")
      : path.join(__dirname, "../../../public", "elsa");

    const exists = fs.existsSync(this.enginePath);
    logger.info(
      `Engine path: ${this.enginePath} (platform=${process.platform}, exists=${exists})`
    );

    if (!exists) {
      logger.warn(
        `Engine binary missing at ${this.enginePath}. ` +
          (isWindows
            ? "On Windows a 'elsa.exe' build is required — the bundled 'elsa' is a Linux ELF and cannot run on native Windows. Run the server under WSL/Docker (Linux) or build elsa.exe from the chess_engine repo."
            : "Ensure the binary is present and has execute permission (chmod +x).")
      );
    }
  }

  public static getInstance() {
    if (!ChessEngine.instance) {
      ChessEngine.instance = new ChessEngine();
    }
    return ChessEngine.instance;
  }

  engineReady = async (): Promise<boolean> => {
    // Fail fast (and loudly) when the binary isn't even on disk — the most
    // common cause of "Computer not available!" in local/Windows setups.
    if (!fs.existsSync(this.enginePath)) {
      logger.error(
        `Engine readiness check skipped: binary not found at ${this.enginePath} (platform=${process.platform}).`
      );
      return false;
    }

    try {
      logger.info(`Engine readiness check: running "${this.enginePath} readyOk"`);
      const result = await execFileP(this.enginePath, ["readyOk"]);
      const engineOutput = parseEngineOutput(result.stdout);

      const ready = engineOutput.includes("Ready Ok!");
      if (!ready) {
        logger.error(
          `Engine readiness check returned unexpected output: ${JSON.stringify(
            engineOutput
          )}`
        );
      }
      return ready;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      logger.error(
        `Chess engine check failed (code=${err.code ?? "?"}): ${err.message}` +
          (err.code === "ENOEXEC"
            ? " — the binary exists but isn't a valid executable for this platform (likely the Linux 'elsa' binary on Windows)."
            : "")
      );
      return false;
    }
  };

  getMoveObject = async (
    fen: string,
    difficulty: string
  ): Promise<{ move: string; fenAfterMove: string }> => {
    const safeDifficulty = VALID_DIFFICULTIES.has(difficulty)
      ? difficulty
      : "expert";

    try {
      const result = await execFileP(this.enginePath, [
        "bestmove",
        "fen",
        fen,
        "depth",
        "difficulty",
        safeDifficulty,
      ]);
      const engineOutput: string[] = parseEngineOutput(result.stdout);

      logger.info(`Engine output: ${engineOutput}`);
      return { move: engineOutput[0], fenAfterMove: engineOutput[1] };
    } catch (error) {
      logger.error(`Error getting engine move: ${error}`);
      throw error;
    }
  };

  // Stream a position analysis live: spawn a fresh `elsa uci` process and drive
  // it with `position fen <fen>` + `go infinite depth <maxDepth>`, surfacing each
  // completed depth's `info` line via onInfo as the search deepens. `infinite`
  // removes the time budget — an explicit `depth` with no clock would otherwise
  // fall back to DEFAULT_SEARCH_TIME (~1s) and never reach deep targets — while
  // `depth` caps how far it goes. onDone fires once when the engine prints
  // `bestmove` (cap reached, or stopped). Scores in onInfo are side-to-move-
  // relative; the caller converts them to White-relative.
  //
  // Returns a handle: call kill() to supersede this search (the server side of
  // the client's latest-wins) or on disconnect — it stops the search, quits the
  // process, and kills it as a backstop. A fresh process per request keeps each
  // analysis isolated (no shared TT / `info` races between requests).
  analyzeStream = (
    fen: string,
    maxDepth: number,
    handlers: {
      onInfo: (info: {
        depth: number;
        scoreCp: number;
        nodes: number;
        pvLan: string[];
      }) => void;
      onDone: () => void;
      onError: (err: Error) => void;
    }
  ): { kill: () => void } => {
    const child = spawn(this.enginePath, ["uci"], { windowsHide: true });
    const stdin = child.stdin!;
    const rl = readline.createInterface({ input: child.stdout! });

    // Writing to a child whose stdin has already closed (it exited at the depth
    // cap, or we just killed it) surfaces EPIPE *asynchronously* as an 'error'
    // event on the stream — a try/catch around .write() can't catch it, and with
    // no listener Node treats it as fatal and crashes the whole server. Swallow
    // the expected pipe-teardown codes here; surface anything else.
    stdin.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED") return;
      logger.warn(`elsa uci stdin error: ${err.message}`);
    });

    // Only write while the pipe is open; the error listener above covers the
    // race the check can't pre-empt.
    const safeWrite = (data: string) => {
      if (stdin.destroyed || !stdin.writable) return;
      stdin.write(data);
    };

    // Guards onDone/onError to fire at most once, and lets kill() short-circuit a
    // late `bestmove` from the aborting search so it can't resolve a superseded
    // position.
    let settled = false;

    const cleanup = () => {
      rl.close();
      if (!stdin.destroyed) {
        stdin.end();
      }
    };

    rl.on("line", (raw) => {
      const line = raw.trim();
      if (line.startsWith("info ")) {
        const info = parseUciInfoLine(line);
        if (info) handlers.onInfo(info);
      } else if (line.startsWith("bestmove")) {
        if (!settled) {
          settled = true;
          handlers.onDone();
        }
        // Search finished; let the process exit cleanly.
        safeWrite("quit\n");
      }
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        handlers.onError(err);
      }
      cleanup();
    });
    child.on("exit", cleanup);
    child.stderr?.on("data", (chunk) =>
      logger.warn(`elsa uci stderr: ${String(chunk).trim()}`)
    );

    safeWrite(`position fen ${fen}\n`);
    safeWrite(`go infinite depth ${maxDepth}\n`);

    return {
      kill: () => {
        // Mark settled before stopping so the search's parting `bestmove` doesn't
        // resolve this (now superseded) request.
        settled = true;
        safeWrite("stop\n");
        safeWrite("quit\n");
        try {
          child.kill();
        } catch {
          /* already exited */
        }
        cleanup();
      },
    };
  };

  speedTest = async (): Promise<string[]> => {
    try {
      const result = await execFileP(this.enginePath, ["speed"]);
      const engineOutput: string[] = parseEngineOutput(result.stdout);

      return engineOutput;
    } catch (error) {
      logger.error(`Error running speed test: ${error}`);
      return [];
    }
  };

  go = async (options: IGoRequest): Promise<string[]> => {
    try {
      const result = await execFileP(this.enginePath, buildGoArgs(options));
      const engineOutput: string[] = parseEngineOutput(result.stdout);

      return engineOutput;
    } catch (error) {
      logger.error(`Error running go: ${error}`);
      return [];
    }
  };
}

export default ChessEngine;
