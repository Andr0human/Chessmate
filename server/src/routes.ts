import { Router } from "express";
import { HealthController } from "./controllers";
import { ErrorHandlerMiddleware } from "./lib/middlewares";
import { gameRouter } from "./module/game";

const router: Router = Router();

router.get("/health", HealthController.check);

router.use("/api/game", gameRouter);

// Handles '404 not found'
router.use(ErrorHandlerMiddleware.notFound);

export default router;
