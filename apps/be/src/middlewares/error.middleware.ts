import { Request, Response, NextFunction } from "express";
import { HttpException } from "../shared/exceptions";
import { APIResponse } from "../shared/utils/response.util";
import { LogService } from "../shared/services/log.service";
import logger from "../configs/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Context chung cho cả Winston file lẫn MongoDB
  const ctx = {
    tenant: req.tenant?.slug || req.user?.tenantId || "unknown",
    userId: req.user?.sub || "anonymous",
    userType: req.user?.userType || "?",
  };

  if (err instanceof HttpException) {
    // Business error (400, 401, 403, 404) → WARN
    logger.warn(`${req.method} ${req.originalUrl} — ${err.message}`, ctx);
    LogService.error(req, err, err.statusCode, "WARN");

    res
      .status(err.statusCode)
      .json(APIResponse.Fail(err.message, err.statusCode));
    return;
  }

  // Unexpected error (500) → ERROR + full stack trace
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
    ...ctx,
    stack: err.stack,
  });
  LogService.error(req, err, 500, "ERROR");

  res.status(500).json(APIResponse.ServerError());
};
