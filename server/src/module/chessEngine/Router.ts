import { Router } from "express";
import ChessEngineController from "./Controller";

class ChessEngineRouter {
  private static instance: ChessEngineRouter;
  public readonly router: Router;

  private constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public static getInstance(): ChessEngineRouter {
    if (!ChessEngineRouter.instance) {
      ChessEngineRouter.instance = new ChessEngineRouter();
    }
    return ChessEngineRouter.instance;
  }

  private setupRoutes(): void {
    this.router.get("/speed", ChessEngineController.speedTest);
  }
}

export default ChessEngineRouter.getInstance().router;
