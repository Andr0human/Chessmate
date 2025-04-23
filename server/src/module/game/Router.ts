import { Router } from "express";
import GameController from "./Controller";

class GameRouter {
  private static instance: GameRouter;
  public readonly router: Router;

  private constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  public static getInstance(): GameRouter {
    if (!GameRouter.instance) {
      GameRouter.instance = new GameRouter();
    }
    return GameRouter.instance;
  }

  private setupRoutes(): void {
    this.router.get(
      "/available/:roomId",
      GameController.checkRoomAvailability
    );

    this.router.get("/all", GameController.getAll);
  }
}

export default GameRouter.getInstance().router;
