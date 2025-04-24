import { NextFunction, Request, Response } from "express";
import { serverConfig } from "../../config";
import logger from "../logger";
import { SystemResponse } from "../response-handler";

class AdminMiddleware {
  static checkPassword = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const { adminPass } = req.query;

      if (!adminPass || adminPass !== serverConfig.adminPass) {
        new SystemResponse(
          res,
          "Unauthorized: Invalid admin password",
          null
        ).unauthorized();
        return;
      }

      next();
    } catch (error) {
      logger.error("AdminMiddleware checkAdminPass error", error);
      new SystemResponse(res, "Internal server error", {
        error,
      }).internalServerError();
    }
  };
}

export default AdminMiddleware;
