import prisma from "../../configs/database";

export class AuthRepository {
  // ─── Admin ───────────────────────────────────────────

  async findAdminByEmail(email: string) {
    return prisma.admin.findUnique({ where: { email } });
  }

  async findAdminById(id: string) {
    return prisma.admin.findUnique({ where: { id } });
  }

  async createAdmin(data: {
    id: string;
    email: string;
    password: string;
    name?: string;
    role: string;
    status: string;
  }) {
    return prisma.admin.create({ data });
  }

  // ─── Refresh Token ───────────────────────────────────
  async createRefreshToken(data: {
    id: string;
    userId: string;
    userType: string;
    token: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data: {
        id: data.id,
        user_id: data.userId,
        user_type: data.userType,
        token: data.token,
        expires_at: data.expiresAt,
      },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
    });
  }

  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.delete({
      where: { token },
    });
  }

  async deleteAllRefreshTokensByUser(userId: string, userType: string) {
    return prisma.refreshToken.deleteMany({
      where: {
        user_id: userId,
        user_type: userType,
      },
    });
  }
}
