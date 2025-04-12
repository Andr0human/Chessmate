import { NextFunction, Request, Response } from "express";
import { SystemResponse } from "../response-handler";

class ErrorHandlerMiddlerware {
  static handle = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    console.error("Error handle middleware", err);
    new SystemResponse(res, "some error occured!", err).internalServerError();
    next();
  };

  static notFound = (req: Request, res: Response): void => {
    new SystemResponse(res, "404 not found!", {}).notFound();
  };
}

export default ErrorHandlerMiddlerware;
