import { TenantRepository } from "./tenant.repository";
import { TenantListQuery } from "./tenant.types";
import { NotFoundException } from "@/shared/exceptions";

const repo = new TenantRepository();

export class TenantService {
  getAll = async (query: TenantListQuery) => {
    const { data, total, page, limit } = await repo.findAll(query);
    return {
      items: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getById = async (id: string) => {
    const tenant = await repo.findById(id);
    if (!tenant) throw new NotFoundException("Không tìm thấy tenant");
    return tenant;
  };

  banTenant = async (id: string) => {
    const tenant = await repo.findById(id);
    if (!tenant) throw new NotFoundException("Không tìm thấy tenant");
    if (tenant.status === "BANNED")
      throw new NotFoundException("Tenant đã bị khóa rồi");
    return repo.updateStatus(id, "BANNED");
  };

  unbanTenant = async (id: string) => {
    const tenant = await repo.findById(id);
    if (!tenant) throw new NotFoundException("Không tìm thấy tenant");
    if (tenant.status === "ACTIVE")
      throw new NotFoundException("Tenant đang hoạt động rồi");
    return repo.updateStatus(id, "ACTIVE");
  };
}
