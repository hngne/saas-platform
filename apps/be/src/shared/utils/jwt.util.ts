import jwt from "jsonwebtoken";
import { env } from "../../configs/env";
import { UnauthorizedException } from "../exceptions";

export type UserType = "ADMIN" | "USER" | "CUSTOMER";

export interface TokenPayload {
  sub: string; // id của user/admin/customer
  type: "access" | "refresh";
  userType: UserType;
  role?: string;
  tenantId?: string;
  dbName?: string;
  businessType?: "RETAIL" | "HOTEL";
}

// ─── Generate ────────────────────────────────────────

export const generateAccessToken = (
  payload: Omit<TokenPayload, "type">,
): string => {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
    issuer: "saas-platform",
  });
};

export const generateRefreshToken = (
  payload: Omit<TokenPayload, "type">,
): string => {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
    issuer: "saas-platform",
  });
};

// ─── Verify ──────────────────────────────────────────

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "saas-platform",
    }) as TokenPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedException("Token đã hết hạn");
    }
    throw new UnauthorizedException("Token không hợp lệ");
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "saas-platform",
    }) as TokenPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }
    throw new UnauthorizedException("Refresh token không hợp lệ");
  }
};

// ─── Decode (không verify, dùng khi cần đọc payload) ─

export const decodeToken = (token: string): TokenPayload | null => {
  return jwt.decode(token) as TokenPayload | null;
};
