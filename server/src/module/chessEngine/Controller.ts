import { Request, Response } from "express";
import logger from "../../lib/logger";
import { SystemResponse } from "../../lib/response-handler";
import ChessEngine from "./Engine";

class ChessEngineController {
  static speedTest = async (req: Request, res: Response): Promise<void> => {
    try {
      const engine: ChessEngine = ChessEngine.getInstance();
      const result: string[] = await engine.speedTest();

      new SystemResponse(res, "Speed test completed", result).ok();
    } catch (error: unknown) {
      logger.error("Error running speed test", error);

      new SystemResponse(res, "Error running speed test", {
        error,
      }).internalServerError();
    }
  };
}
export default ChessEngineController;
