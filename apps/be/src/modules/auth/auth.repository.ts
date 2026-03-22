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

  // ─── Tenant ───────────────────────────────────────────

  async findTenantBySlug(slug: string) {
    return prisma.tenant.findUnique({ where: { slug } });
  }

  async createTenantWithProfile(data: {
    id: string;
    slug: string;
    business_type: string;
    db_name: string;
    profile: {
      id: string;
      store_name: string;
      owner_name: string;
      phone?: string;
      email: string;
    };
  }) {
    return prisma.tenant.create({
      data: {
        id: data.id,
        slug: data.slug,
        business_type: data.business_type,
        db_name: data.db_name,
        status: "ACTIVE",
        profile: {
          create: {
            id: data.profile.id,
            store_name: data.profile.store_name,
            owner_name: data.profile.owner_name,
            phone: data.profile.phone,
            email: data.profile.email,
          },
        },
      },
      include: { profile: true },
    });
  }

  async findTenantByEmail(email: string) {
    return prisma.tenant.findFirst({
      where: {
        profile: {
          email,
        },
      },
      include: { profile: true },
    });
  }

  async deleteTenantById(id: string) {
    return prisma.tenant.delete({ where: { id } }).catch(() => {});
  }
}
