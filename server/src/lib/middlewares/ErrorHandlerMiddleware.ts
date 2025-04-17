import { NextFunction, Request, Response } from "express";
import logger from "../logger";
import { SystemResponse } from "../response-handler";

class ErrorHandlerMiddlerware {
  static handle = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    logger.error("Error handle middleware", err);
    new SystemResponse(res, "some error occured!", err).internalServerError();
    next();
  };

  static notFound = (req: Request, res: Response): void => {
    new SystemResponse(res, "404 not found!", {}).notFound();
  };
}

export default ErrorHandlerMiddlerware;
