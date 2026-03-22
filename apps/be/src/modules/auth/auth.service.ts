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
  MerchantRegisterResponse,
  UserLoginResponse,
} from "./auth.types";
import { LoginDto, MerchantRegisterDto } from "./auth.validators";
import { comparePassword, hashPassword } from "@/shared/utils/hash.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/shared/utils/jwt.util";
import { randomUUID } from "crypto";
import { provisionTenantDB } from "../tenant/tenant-provisioning.service";
import { getTenantDB, clients } from "@/configs/tenant-db";
import { env } from "@/configs/env";
import { PrismaClient } from "@prisma/client";

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

    // Nếu là ADMIN → query db_platform như cũ
    if (payload.userType === "ADMIN") {
      const store = await repo.findRefreshToken(refreshToken);
      if (!store) throw new BadRequestException("Refresh token không hợp lệ");
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
    }

    // Nếu là USER/CUSTOMER → query db_tenant
    if (!payload.dbName) throw new UnauthorizedException("Token không hợp lệ");
    const tenantDB = getTenantDB(payload.dbName);
    const store = await tenantDB.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!store) throw new BadRequestException("Refresh token không hợp lệ");
    if (store.expires_at < new Date()) {
      await tenantDB.refreshToken.delete({ where: { token: refreshToken } });
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }
    await tenantDB.refreshToken.delete({ where: { token: refreshToken } });
    return this._generateAndSaveTokensMerchant(
      payload.sub,
      payload.userType,
      payload.role!,
      payload.tenantId!,
      payload.dbName,
      tenantDB,
    );
  };

  merchantRegister = async (
    dto: MerchantRegisterDto,
  ): Promise<MerchantRegisterResponse> => {
    // 1. Generate slug từ store_name
    const slug = dto.store_name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const dbName = `db_${slug.replace(/-/g, "_")}`;

    // 2. Check slug đã tồn tại chưa
    const existing = await repo.findTenantBySlug(slug);
    if (existing) {
      throw new BadRequestException(
        "Tên cửa hàng đã tồn tại, vui lòng chọn tên khác!",
      );
    }

    // 3. Tạo tenant trong db_platform
    const tenantId = randomUUID();
    const tenant = await repo.createTenantWithProfile({
      id: tenantId,
      slug,
      business_type: dto.business_type,
      db_name: dbName,
      profile: {
        id: randomUUID(),
        store_name: dto.store_name,
        owner_name: dto.owner_name,
        phone: dto.phone,
        email: dto.email,
      },
    });

    let dbProvisioned = false;

    try {
      // 4. Tạo DB + push schema
      await provisionTenantDB(dbName);
      dbProvisioned = true;

      // 5. Tạo OWNER trong db_tenant
      const tenantDB = getTenantDB(dbName);
      const hashedPassword = await hashPassword(dto.password);
      const userId = randomUUID();

      const user = await tenantDB.user.create({
        data: {
          id: userId,
          email: dto.email,
          password: hashedPassword,
          name: dto.owner_name,
          phone: dto.phone,
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      // 6. Tạo refresh token trong db_tenant
      const tokens = await this._generateAndSaveTokensMerchant(
        userId,
        "USER",
        "OWNER",
        tenant.id,
        dbName,
        tenantDB,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          store_name: tenant.profile?.store_name ?? null,
        },
        tokens,
      };
    } catch (error) {
      // Rollback: xóa tenant nếu có lỗi
      await repo.deleteTenantById(tenantId);

      if (dbProvisioned) {
        const masterClient = new PrismaClient({
          datasources: {
            db: {
              url: `mysql://${env.DB_USER}:${env.DB_PASS}@${env.DB_HOST}:${env.DB_PORT}/mysql`,
            },
          },
        });
        await masterClient
          .$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\``)
          .catch(() => {}); // không throw nếu drop fail
        await masterClient.$disconnect();
      }

      clients.get(dbName)?.$disconnect();
      clients.delete(dbName);

      throw error;
    }
  };

  findTenantByEmail = async (email: string) => {
    return repo.findTenantByEmail(email);
  };

  merchantLogin = async (dto: LoginDto): Promise<UserLoginResponse> => {
    // Cần biết tenant từ slug (lấy từ req.tenant do middleware extract)
    // → sẽ handle ở controller, truyền dbName vào
    throw new Error("Dùng merchantLoginWithTenant thay thế");
  };

  merchantLoginWithTenant = async (
    dto: LoginDto,
    dbName: string,
    tenantId: string,
    tenantSlug: string,
    businessType: string,
  ): Promise<UserLoginResponse> => {
    const tenantDB = getTenantDB(dbName);

    const user = await tenantDB.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException("Tài khoản hoặc mật khẩu không chính xác");
    }

    if (user.status !== "ACTIVE") {
      throw new BadRequestException("Tài khoản đã bị khóa");
    }

    const isValid = await comparePassword(dto.password, user.password);
    if (!isValid) {
      throw new BadRequestException("Tài khoản hoặc mật khẩu không chính xác");
    }

    const tokens = await this._generateAndSaveTokensMerchant(
      user.id,
      "USER",
      user.role,
      tenantId,
      dbName,
      tenantDB,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenantId,
        slug: tenantSlug,
        businessType,
      },
      tokens,
    };
  };

  merchantLogout = async (
    refreshToken: string,
    dbName: string,
  ): Promise<void> => {
    const tenantDB = getTenantDB(dbName);
    await tenantDB.refreshToken
      .delete({ where: { token: refreshToken } })
      .catch(() => {});
  };

  //helper gen token
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

  // Helper riêng cho merchant — lưu token vào db_tenant thay vì db_platform
  private _generateAndSaveTokensMerchant = async (
    userId: string,
    userType: string,
    role: string,
    tenantId: string,
    dbName: string,
    tenantDB: any,
  ): Promise<AuthTokens> => {
    const accessToken = generateAccessToken({
      sub: userId,
      userType: userType as any,
      role,
      tenantId,
      dbName,
    });

    const refreshToken = generateRefreshToken({
      sub: userId,
      userType: userType as any,
      role,
      tenantId,
      dbName,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await tenantDB.refreshToken.create({
      data: {
        id: randomUUID(),
        user_id: userId,
        user_type: userType,
        token: refreshToken,
        expires_at: expiresAt,
      },
    });

    return { accessToken, refreshToken };
  };
}
