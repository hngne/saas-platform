import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { CreateStaffDto, StaffFilterDto, UpdateStaffDto } from "./staff.validator";

const staffSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const;

export class StaffRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: StaffFilterDto) {
    const { page, limit, search, role, status, sort_by, sort_order } = filter;
    const keyword = search?.trim();
    const where: any = {
      deleted_at: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(keyword && {
        OR: [
          { name: { contains: keyword } },
          { email: { contains: keyword } },
          { phone: { contains: keyword } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: staffSelect,
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.user.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getSummary() {
    const [total, active, blocked, owners] = await Promise.all([
      this.db.user.count({ where: { deleted_at: null } }),
      this.db.user.count({ where: { deleted_at: null, status: "ACTIVE" } }),
      this.db.user.count({
        where: { deleted_at: null, status: { in: ["INACTIVE", "BANNED"] } },
      }),
      this.db.user.count({
        where: { deleted_at: null, role: "OWNER", status: "ACTIVE" },
      }),
    ]);

    return { total, active, blocked, owners };
  }

  async findById(id: string) {
    return this.db.user.findFirst({
      where: { id, deleted_at: null },
      select: staffSelect,
    });
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  async countActiveOwners(excludeId?: string) {
    return this.db.user.count({
      where: {
        deleted_at: null,
        role: "OWNER",
        status: "ACTIVE",
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreateStaffDto & { id: string; password: string }) {
    return this.db.user.create({
      data: dto,
      select: staffSelect,
    });
  }

  async update(id: string, dto: UpdateStaffDto) {
    return this.db.user.update({
      where: { id },
      data: dto,
      select: staffSelect,
    });
  }

  async updateStatus(id: string, status: string) {
    return this.db.user.update({
      where: { id },
      data: { status },
      select: staffSelect,
    });
  }

  async softDelete(id: string) {
    return this.db.user.update({
      where: { id },
      data: { deleted_at: new Date(), status: "INACTIVE" },
      select: staffSelect,
    });
  }

  async deleteRefreshTokens(userId: string) {
    return this.db.refreshToken.deleteMany({
      where: { user_id: userId, user_type: "USER" },
    });
  }
}
