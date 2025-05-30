import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import logger from "../../lib/logger";
import { IGoRequest } from "./entities";
import { buildGoCommand, parseEngineOutput } from "./helpers";

const execPromise = promisify(exec);

class ChessEngine {
  private static instance: ChessEngine;
  private enginePath: string;

  private constructor() {
    // Check which executable to use based on OS
    const isWindows = process.platform === "win32";
    this.enginePath = isWindows
      ? path.join(__dirname, "../../../public", "elsa.exe")
      : path.join(__dirname, "../../../public", "elsa");

    logger.info(`Engine path: ${this.enginePath}`);
  }

  public static getInstance() {
    if (!ChessEngine.instance) {
      ChessEngine.instance = new ChessEngine();
    }
    return ChessEngine.instance;
  }

  engineReady = async (): Promise<boolean> => {
    try {
      // Execute the ready check command
      const result = await execPromise(`${this.enginePath} readyOk`);
      const engineOutput = parseEngineOutput(result.stdout);

      return engineOutput.includes("Ready Ok!");
    } catch (error) {
      console.error("Chess engine check failed:", error);
      return false;
    }
  };

  getMoveObject = async (
    fen: string,
    difficulty: string
  ): Promise<{ move: string; fenAfterMove: string }> => {
    const result = await execPromise(
      `${this.enginePath} bestmove fen "${fen}" depth difficulty ${difficulty}`
    );
    const engineOutput: string[] = parseEngineOutput(result.stdout);

    logger.info(`Engine output: ${engineOutput}`);
    return { move: engineOutput[0], fenAfterMove: engineOutput[1] };
  };

  speedTest = async (): Promise<string[]> => {
    try {
      const result = await execPromise(`${this.enginePath} speed`);
      const engineOutput: string[] = parseEngineOutput(result.stdout);

      return engineOutput;
    } catch (error) {
      logger.error(`Error running speed test: ${error}`);
      return [];
    }
  };

  go = async (options: IGoRequest): Promise<string[]> => {
    try {
      const result = await execPromise(
        buildGoCommand(this.enginePath, options)
      );
      const engineOutput: string[] = parseEngineOutput(result.stdout);

      return engineOutput;
    } catch (error) {
      logger.error(`Error running go: ${error}`);
      return [];
    }
  };
}

export default ChessEngine;
