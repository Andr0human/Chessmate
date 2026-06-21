import { Router } from "express";
import { AdminMiddleware } from "../../lib/middlewares";
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

    // Exposes player socket ids, FENs and clocks for every live room —
    // admin-only to prevent unauthenticated enumeration of active games.
    this.router.get("/all", AdminMiddleware.checkPassword, GameController.getAll);
  }
}

export default GameRouter.getInstance().router;
