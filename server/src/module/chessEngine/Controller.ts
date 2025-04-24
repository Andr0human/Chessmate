import { Request, Response } from "express";
import logger from "../../lib/logger";
import { SystemResponse } from "../../lib/response-handler";
import ChessEngine from "./Engine";
import { IGoRequest } from "./entities";

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

  static go = async (req: Request, res: Response): Promise<void> => {
    try {
      const engine: ChessEngine = ChessEngine.getInstance();
      const goOptions: IGoRequest = req.body;

      const result: string[] = await engine.go(goOptions);

      new SystemResponse(res, "Go completed", {
        options: goOptions,
        result,
      }).ok();
    } catch (error: unknown) {
      logger.error("Error running go", error);

      new SystemResponse(res, "Error running go", {
        error,
      }).internalServerError();
    }
  };
}
export default ChessEngineController;
