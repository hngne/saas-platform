import { CacheService } from "@/configs/redis";
import { getTenantDB } from "@/configs/tenant-db";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@/shared/exceptions";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@/shared/utils/jwt.util";
import { comparePassword, hashPassword } from "@/shared/utils/hash.util";
import { createHash } from "crypto";
import { CustomerAuthRepository } from "./customer-auth.repository";
import { CustomerLoginDto, CustomerRegisterDto } from "./customer-auth.validator";

const AUTO_LOGIN_TTL_SECONDS = 7 * 24 * 60 * 60;

type CustomerSessionUser = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
};

export class CustomerAuthService {
  private cache = new CacheService();

  private getAutoLoginKey(tenantId: string, customerId: string, refreshToken: string) {
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    return `customer:autologin:${tenantId}:${customerId}:${tokenHash}`;
  }

  private async saveAutoLoginKey(params: {
    tenantId: string;
    dbName: string;
    customerId: string;
    refreshToken: string;
    expiresAt: Date;
  }) {
    await this.cache.set(
      this.getAutoLoginKey(params.tenantId, params.customerId, params.refreshToken),
      {
        tenantId: params.tenantId,
        dbName: params.dbName,
        customerId: params.customerId,
        expiresAt: params.expiresAt.toISOString(),
      },
      AUTO_LOGIN_TTL_SECONDS,
    );
  }

  private async deleteAutoLoginKey(tenantId: string, customerId: string, refreshToken: string) {
    await this.cache.del(this.getAutoLoginKey(tenantId, customerId, refreshToken));
  }

  private async createSession(dbName: string, tenantId: string, customer: CustomerSessionUser) {
    const payload = {
      sub: customer.id,
      userType: "CUSTOMER" as const,
      tenantId,
      dbName,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const tenantDB = getTenantDB(dbName);
    await tenantDB.refreshToken.create({
      data: {
        user_id: customer.id,
        user_type: "CUSTOMER",
        token: refreshToken,
        expires_at: expiresAt,
      },
    });

    await this.saveAutoLoginKey({
      tenantId,
      dbName,
      customerId: customer.id,
      refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatar: customer.avatar_url,
        avatar_url: customer.avatar_url,
      },
    };
  }

  async register(dbName: string, dto: CustomerRegisterDto) {
    const tenantDB = getTenantDB(dbName);
    const repo = new CustomerAuthRepository(tenantDB);
    const existing = await repo.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException("Email này đã được sử dụng tại cửa hàng này");
    }

    const hashedPassword = await hashPassword(dto.password);
    return repo.createCustomer(dto, hashedPassword);
  }

  async login(dbName: string, tenantId: string, dto: CustomerLoginDto) {
    const tenantDB = getTenantDB(dbName);
    const repo = new CustomerAuthRepository(tenantDB);
    const customer = await repo.findByEmail(dto.email);

    if (!customer) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }

    if (customer.status !== "ACTIVE") {
      throw new UnauthorizedException("Tài khoản của bạn đã bị khóa");
    }

    const isMatch = await comparePassword(dto.password, customer.password);
    if (!isMatch) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }

    return this.createSession(dbName, tenantId, customer);
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    if (payload.userType !== "CUSTOMER" || !payload.dbName || !payload.tenantId) {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }

    const tenantDB = getTenantDB(payload.dbName);
    const storedToken = await tenantDB.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (
      !storedToken ||
      storedToken.user_id !== payload.sub ||
      storedToken.user_type !== "CUSTOMER"
    ) {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }

    if (storedToken.expires_at < new Date()) {
      await tenantDB.refreshToken.delete({ where: { token: refreshToken } }).catch(() => null);
      await this.deleteAutoLoginKey(payload.tenantId, payload.sub, refreshToken);
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }

    const repo = new CustomerAuthRepository(tenantDB);
    const customer = await repo.findByIdWithAddresses(payload.sub);

    if (!customer) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }

    if (customer.status !== "ACTIVE") {
      await tenantDB.refreshToken.delete({ where: { token: refreshToken } }).catch(() => null);
      await this.deleteAutoLoginKey(payload.tenantId, payload.sub, refreshToken);
      throw new UnauthorizedException("Tài khoản của bạn đã bị khóa");
    }

    await tenantDB.refreshToken.delete({ where: { token: refreshToken } });
    await this.deleteAutoLoginKey(payload.tenantId, payload.sub, refreshToken);

    return this.createSession(payload.dbName, payload.tenantId, customer);
  }

  async logout(dbName: string, tenantId: string, customerId: string, refreshToken?: string) {
    const tenantDB = getTenantDB(dbName);

    if (refreshToken) {
      await tenantDB.refreshToken.delete({ where: { token: refreshToken } }).catch(() => null);
      await this.deleteAutoLoginKey(tenantId, customerId, refreshToken);
      return;
    }

    await tenantDB.refreshToken.deleteMany({
      where: { user_id: customerId, user_type: "CUSTOMER" },
    });
    await this.cache.delPattern(`customer:autologin:${tenantId}:${customerId}:*`);
  }

  async getProfile(dbName: string, customerId: string) {
    const tenantDB = getTenantDB(dbName);
    const repo = new CustomerAuthRepository(tenantDB);
    const customer = await repo.findByIdWithAddresses(customerId);

    if (!customer) throw new NotFoundException("Không tìm thấy người dùng");

    return customer;
  }

  async updateProfile(dbName: string, customerId: string, data: { name?: string; phone?: string }) {
    const tenantDB = getTenantDB(dbName);
    const repo = new CustomerAuthRepository(tenantDB);
    const customer = await repo.findByIdWithAddresses(customerId);

    if (!customer) throw new NotFoundException("Không tìm thấy người dùng");

    return repo.updateProfile(customerId, data);
  }

  async changePassword(dbName: string, customerId: string, dto: any) {
    const tenantDB = getTenantDB(dbName);
    const repo = new CustomerAuthRepository(tenantDB);
    const customer = await repo.findByIdForPassword(customerId);

    if (!customer) throw new NotFoundException("Không tìm thấy người dùng");

    const isMatch = await comparePassword(dto.oldPassword, customer.password);
    if (!isMatch) throw new BadRequestException("Mật khẩu cũ không chính xác");

    const hashedPassword = await hashPassword(dto.newPassword);
    await repo.updatePassword(customerId, hashedPassword);
  }
}
