import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { serverConfig } from "../../config";
import logger from "../logger";
import { SystemResponse } from "../response-handler";

// Constant-time string compare. Hashing both sides to fixed-length digests
// keeps the buffers equal-length (timingSafeEqual throws otherwise) and avoids
// leaking the secret's length through the comparison.
const safeEqual = (a: string, b: string): boolean => {
  const aHash = crypto.createHash("sha256").update(a).digest();
  const bHash = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(aHash, bHash);
};

class AdminMiddleware {
  // Shared admin-secret check, reusable outside the Express request cycle (e.g.
  // Socket.IO handlers, which never pass through this middleware). Fails closed
  // when ADMIN_PASS is unset so protected features are unreachable rather than
  // guarded by a guessable default. Constant-time compare via safeEqual.
  static verify = (provided?: string): boolean => {
    const expected = serverConfig.adminPass;

    if (!expected) {
      logger.error("AdminMiddleware: ADMIN_PASS is not set; rejecting request");
      return false;
    }

    return !!provided && safeEqual(provided, expected);
  };

  static checkPassword = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      // Read from a header (not the query string) so the secret doesn't leak
      // into access logs, proxy logs, or browser history.
      const provided = req.header("x-admin-pass");

      if (!AdminMiddleware.verify(provided)) {
        new SystemResponse(
          res,
          "Unauthorized: Invalid admin password",
          null
        ).unauthorized();
        return;
      }

      next();
    } catch (error) {
      logger.error("AdminMiddleware checkPassword error", error);
      new SystemResponse(res, "Internal server error", {
        error,
      }).internalServerError();
    }
  };
}

export default AdminMiddleware;
