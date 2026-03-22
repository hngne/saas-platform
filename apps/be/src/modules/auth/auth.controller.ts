import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { APIResponse } from "@/shared/utils/response.util";

const service = new AuthService();
export class AuthController {
  adminlogin = async (req: Request, res: Response) => {
    const result = await service.adminLogin(req.body);
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
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
    res.clearCookie("refreshToken");
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
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json(
      APIResponse.OK("Làm mới token thành công", {
        accessToken: tokens.accessToken,
      }),
    );
  };

  merchantRegister = async (req: Request, res: Response) => {
    const result = await service.merchantRegister(req.body);
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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
    res.clearCookie("refreshToken");
    res.status(200).json(APIResponse.OK("Đăng xuất thành công"));
  };
}
