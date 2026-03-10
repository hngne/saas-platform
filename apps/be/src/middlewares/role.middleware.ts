import { Request, Response, NextFunction } from "express";
import { APIResponse } from "../shared/utils/response.util";

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(APIResponse.Unauthorized());
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res
        .status(403)
        .json(APIResponse.Forbidden("Bạn không có quyền thực hiện"));
      return;
    }

    next();
  };
};
