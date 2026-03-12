import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/shared/exceptions";
import { AuthRepository } from "./auth.repository";
import {
  AdminLoginResponse,
  AuthTokens,
  CreateAdminRequest,
} from "./auth.types";
import { LoginDto } from "./auth.validators";
import { comparePassword, hashPassword } from "@/shared/utils/hash.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/shared/utils/jwt.util";
import { randomUUID } from "crypto";

const repo = new AuthRepository();

export class AuthService {
  adminLogin = async (dto: LoginDto): Promise<AdminLoginResponse> => {
    const admin = await repo.findAdminByEmail(dto.email);
    if (!admin) {
      throw new NotFoundException("Tài khoản hoặc mật khẩu không chính xác");
    }

    if (admin.status !== "ACTIVE") {
      throw new BadRequestException("Tài khoản đã bị khóa");
    }
    const isPasswordValid = await comparePassword(dto.password, admin.password);
    if (!isPasswordValid) {
      throw new BadRequestException("Tài khoản hoặc mật khẩu không chính xác");
    }
    const token = await this._generateAndSaveTokens(
      admin.id,
      "ADMIN",
      admin.role,
    );
    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      tokens: token,
    };
  };

  adminRegisterTemp = async (dto: CreateAdminRequest): Promise<any> => {
    const hashedPassword = await hashPassword(dto.password);
    return repo.createAdmin({
      id: randomUUID(),
      email: dto.email,
      password: hashedPassword,
      name: dto.name || "Admin",
      role: dto.role || "ADMIN",
      status: "ACTIVE",
    });
  };

  adminLogout = async (refreshToken: string): Promise<void> => {
    await repo.deleteRefreshToken(refreshToken).catch(() => {});
  };

  refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
    const payload = verifyRefreshToken(refreshToken);

    const store = await repo.findRefreshToken(refreshToken);
    if (!store) {
      throw new BadRequestException("Refresh token không hợp lệ");
    }

    if (store.expires_at < new Date()) {
      await repo.deleteRefreshToken(refreshToken);
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }

    await repo.deleteRefreshToken(refreshToken);

    return this._generateAndSaveTokens(
      payload.sub,
      payload.userType,
      payload.role,
    );
  };
  private _generateAndSaveTokens = async (
    userId: string,
    userType: string,
    role?: string,
    tenantId?: string,
    businessType?: "RETAIL" | "HOTEL",
  ): Promise<AuthTokens> => {
    const accessToken = generateAccessToken({
      sub: userId,
      userType: userType as any,
      role,
      tenantId,
      businessType,
    });

    const refreshToken = generateRefreshToken({
      sub: userId,
      userType: userType as any,
      role,
      tenantId,
      businessType,
    });

    // Tính thời gian hết hạn refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 ngày

    // Lưu refresh token vào DB
    await repo.createRefreshToken({
      id: randomUUID(),
      userId,
      userType,
      token: refreshToken,
      expiresAt: expiresAt,
    });

    return { accessToken, refreshToken };
  };
}
