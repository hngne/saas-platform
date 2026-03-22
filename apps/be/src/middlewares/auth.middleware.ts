import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../shared/utils/jwt.util";
import { APIResponse } from "../shared/utils/response.util";
import { Tenant, TenantProfile } from "@prisma/client";

// Extend Request để attach user vào
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      tenant?: Tenant & { profile: TenantProfile | null };
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json(APIResponse.Unauthorized("Vui lòng đăng nhập"));
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error: any) {
    res.status(401).json(APIResponse.Unauthorized(error.message));
  }
};

// Chỉ cho phép userType cụ thể
export const requireUserType = (...userTypes: TokenPayload["userType"][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(APIResponse.Unauthorized());
      return;
    }

    if (!userTypes.includes(req.user.userType)) {
      res.status(403).json(APIResponse.Forbidden());
      return;
    }

    next();
  };
};
