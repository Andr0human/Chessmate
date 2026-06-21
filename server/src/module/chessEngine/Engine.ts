import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import logger from "../../lib/logger";
import { IAnalysisResult, IGoRequest } from "./entities";
import { buildGoArgs, parseAnalysisOutput, parseEngineOutput } from "./helpers";

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

  // Analyze a position: run a time-bounded search and parse `elsa go`'s table
  // output into a structured evaluation (score/depth/nodes/PV). Same safe
  // execFile pattern as getMoveObject — the FEN is an argv element, never shell.
  analyze = async (
    fen: string,
    searchSeconds: number
  ): Promise<IAnalysisResult> => {
    const result = await execFileP(this.enginePath, [
      "go",
      "fen",
      fen,
      "time",
      String(searchSeconds),
    ]);
    const engineOutput: string[] = parseEngineOutput(result.stdout);

    return parseAnalysisOutput(engineOutput);
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
