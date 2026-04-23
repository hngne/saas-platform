import { randomUUID } from "crypto";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/shared/exceptions";
import { hashPassword } from "@/shared/utils/hash.util";
import { CreateStaffDto, StaffFilterDto, UpdateStaffDto } from "./staff.validator";
import { StaffRepository } from "./staff.repository";

export class StaffService {
  private repo: StaffRepository;

  constructor(db: RetailClient) {
    this.repo = new StaffRepository(db);
  }

  getAll = async (filter: StaffFilterDto) => {
    return this.repo.findAll(filter);
  };

  getSummary = async () => {
    return this.repo.getSummary();
  };

  getById = async (id: string) => {
    const staff = await this.repo.findById(id);
    if (!staff) throw new NotFoundException("Không tìm thấy nhân viên");
    return staff;
  };

  create = async (dto: CreateStaffDto) => {
    if (dto.role === "OWNER") {
      throw new BadRequestException("Không thể tạo thêm tài khoản OWNER từ màn nhân viên");
    }

    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new BadRequestException("Email đã tồn tại");

    const hashedPassword = await hashPassword(dto.password);
    return this.repo.create({
      ...dto,
      id: randomUUID(),
      password: hashedPassword,
    });
  };

  update = async (id: string, dto: UpdateStaffDto, actorId: string) => {
    const staff = await this.getById(id);

    if (dto.email && dto.email !== staff.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException("Email đã tồn tại");
      }
    }

    const touchesSelfPermission =
      id === actorId && (dto.role !== undefined || dto.status !== undefined);
    if (touchesSelfPermission) {
      throw new ForbiddenException("Bạn không thể tự đổi vai trò hoặc trạng thái của mình");
    }

    const changesOwner =
      staff.role === "OWNER" &&
      ((dto.role && dto.role !== staff.role) ||
        (dto.status && dto.status !== staff.status));

    if (changesOwner) {
      throw new ForbiddenException("Không thể đổi vai trò hoặc trạng thái tài khoản OWNER");
    }

    if (dto.role === "OWNER" && staff.role !== "OWNER") {
      throw new ForbiddenException("Không thể nâng nhân viên thành OWNER từ màn nhân viên");
    }

    return this.repo.update(id, dto);
  };

  updateStatus = async (id: string, status: string, actorId: string) => {
    const staff = await this.getById(id);

    if (id === actorId && status !== staff.status) {
      throw new ForbiddenException("Bạn không thể tự đổi trạng thái tài khoản của mình");
    }

    if (staff.role === "OWNER" && status !== staff.status) {
      throw new ForbiddenException("Không thể đổi trạng thái tài khoản OWNER");
    }

    const updated = await this.repo.updateStatus(id, status);
    if (status !== "ACTIVE") {
      await this.repo.deleteRefreshTokens(id);
    }
    return updated;
  };

  delete = async (id: string, actorId: string) => {
    const staff = await this.getById(id);

    if (id === actorId) {
      throw new ForbiddenException("Bạn không thể tự xóa tài khoản của mình");
    }

    if (staff.role === "OWNER") {
      throw new ForbiddenException("Không thể xóa tài khoản OWNER");
    }

    await this.repo.deleteRefreshTokens(id);
    return this.repo.softDelete(id);
  };

  private ensureAnotherActiveOwner = async (excludeId: string) => {
    const owners = await this.repo.countActiveOwners(excludeId);
    if (owners < 1) {
      throw new BadRequestException("Cần giữ lại ít nhất một OWNER đang hoạt động");
    }
  };
}
