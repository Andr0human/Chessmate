import { Router } from "express";
import { HealthController } from "./controllers";
import { ErrorHandlerMiddleware } from "./lib/middlewares";
import { chessEngineRouter, gameRouter } from "./module";

const router: Router = Router();

router.get("/health", HealthController.check);

router.use("/api/game", gameRouter);

router.use("/api/engine", chessEngineRouter);

// Handles '404 not found'
router.use(ErrorHandlerMiddleware.notFound);

export default router;
