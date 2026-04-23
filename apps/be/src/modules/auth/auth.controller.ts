import { CookieOptions, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { APIResponse } from "@/shared/utils/response.util";
import { env } from "@/configs/env";
import { LogService } from "@/shared/services/log.service";
import logger from "@/configs/logger";

const service = new AuthService();
const isProduction = env.NODE_ENV === "production";
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  adminlogin = async (req: Request, res: Response) => {
    const result = await service.adminLogin(req.body);
    res.cookie("refreshToken", result.tokens.refreshToken, refreshCookieOptions);
    logger.info(`POST ${req.originalUrl} — Admin đăng nhập: ${req.body.email}`, {
      tenant: "platform", userId: result.admin.id, userType: "ADMIN",
    });
    res.status(200).json(
      APIResponse.OK("Đăng nhập thành công", {
        admin: result.admin,
        accessToken: result.tokens.accessToken,
      }),
    );
  };

  adminRegisterTemp = async (req: Request, res: Response): Promise<void> => {
    const result = await service.adminRegisterTemp(req.body);
    res.status(201).json(
      APIResponse.Created("Tạo tài khoản thành công", {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      }),
    );
  };

  adminlogout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await service.adminLogout(refreshToken);
    }
    res.clearCookie("refreshToken", refreshCookieOptions);
    res.status(200).json(APIResponse.OK("Đăng xuất thành công"));
  };

  refreshtoken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res
        .status(401)
        .json(APIResponse.Unauthorized("Không tìm thấy refresh token"));
      return;
    }
    const tokens = await service.refreshToken(refreshToken);
    res.cookie("refreshToken", tokens.refreshToken, refreshCookieOptions);
    res.status(200).json(
      APIResponse.OK("Làm mới token thành công", {
        accessToken: tokens.accessToken,
      }),
    );
  };

  merchantRegister = async (req: Request, res: Response) => {
    const result = await service.merchantRegister(req.body);
    res.cookie("refreshToken", result.tokens.refreshToken, refreshCookieOptions);
    res.status(201).json(
      APIResponse.Created("Đăng ký cửa hàng thành công", {
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken,
      }),
    );
  };

  merchantLogin = async (req: Request, res: Response) => {
    const tenant = req.tenant!;
    const result = await service.merchantLoginWithTenant(
      req.body,
      tenant.db_name,
      tenant.id,
      tenant.slug,
      tenant.business_type,
    );
    res.cookie("refreshToken", result.tokens.refreshToken, refreshCookieOptions);
    logger.info(`POST ${req.originalUrl} — Merchant đăng nhập: ${req.body.email}`, {
      tenant: tenant.slug, userId: result.user.id, userType: "USER",
    });
    LogService.activity(req, "LOGIN", "User", result.user.id, { email: req.body.email });
    res.status(200).json(
      APIResponse.OK("Đăng nhập thành công", {
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken,
      }),
    );
  };

  merchantLoginGlobal = async (req: Request, res: Response) => {
    const tenant = await service.findTenantByEmail(req.body.email);

    if (!tenant) {
      res
        .status(404)
        .json(
          APIResponse.NotFound("Không tìm thấy cửa hàng liên kết với email này"),
        );
      return;
    }

    const result = await service.merchantLoginWithTenant(
      req.body,
      tenant.db_name,
      tenant.id,
      tenant.slug,
      tenant.business_type,
    );
    res.cookie("refreshToken", result.tokens.refreshToken, refreshCookieOptions);
    logger.info(`POST ${req.originalUrl} — Merchant đăng nhập (global): ${req.body.email}`, {
      tenant: tenant.slug, userId: result.user.id, userType: "USER",
    });
    LogService.activity(req, "LOGIN", "User", result.user.id, { email: req.body.email, method: "global" });
    res.status(200).json(
      APIResponse.OK("Đăng nhập thành công", {
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken,
      }),
    );
  };

  merchantLogout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    const payload = req.user!; // lấy từ authenticate middleware
    if (refreshToken && payload.dbName) {
      await service.merchantLogout(refreshToken, payload.dbName);
    }
    res.clearCookie("refreshToken", refreshCookieOptions);
    res.status(200).json(APIResponse.OK("Đăng xuất thành công"));
  };
  merchantProfile = async (req: Request, res: Response) => {
    const payload = req.user!;
    const result = await service.getMerchantProfile(
      payload.sub,
      payload.tenantId!,
      payload.dbName!,
    );
    res
      .status(200)
      .json(APIResponse.OK("Lấy thông tin merchant thành công", result));
  };
}
