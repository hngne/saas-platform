import { Request, Response, NextFunction } from "express";
import { HttpException } from "../shared/exceptions";
import { APIResponse } from "../shared/utils/response.util";
import logger from "../configs/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof HttpException) {
    logger.warn(
      `[${req.method}] ${req.path} - ${err.statusCode}: ${err.message}`,
    );
    res
      .status(err.statusCode)
      .json(APIResponse.Fail(err.message, err.statusCode));
    return;
  }

  logger.error(`[${req.method}] ${req.path} - 500: ${err.message}`, {
    stack: err.stack,
  });
  res.status(500).json(APIResponse.ServerError());
};
