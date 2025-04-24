import { Router } from "express";
import { AdminMiddleware } from "../../lib/middlewares";
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
    // Apply admin password middleware to all engine routes
    this.router.use(AdminMiddleware.checkPassword);

    // Engine routes
    this.router.get("/speed", ChessEngineController.speedTest);

    this.router.post("/go", ChessEngineController.go);
  }
}

export default ChessEngineRouter.getInstance().router;
