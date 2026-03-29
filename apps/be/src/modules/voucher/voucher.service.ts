import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { VoucherRepository } from "./voucher.repository";
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherFilterDto,
} from "./voucher.validator";

export class VoucherService {
  private repo: VoucherRepository;

  constructor(db: RetailClient) {
    this.repo = new VoucherRepository(db);
  }

  getAll = async (filter: VoucherFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const voucher = await this.repo.findById(id);
    if (!voucher) throw new NotFoundException("Voucher không tồn tại");
    return voucher;
  };

  create = async (dto: CreateVoucherDto) => {
    const existing = await this.repo.findByCode(dto.code);
    if (existing) throw new BadRequestException("Mã voucher đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateVoucherDto) => {
    await this.getById(id);
    if (dto.code) {
      const existing = await this.repo.findByCode(dto.code, id);
      if (existing) throw new BadRequestException("Mã voucher đã tồn tại");
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const isUsed = await this.repo.isUsedInOrder(id);
    if (isUsed) {
      throw new BadRequestException(
        "Voucher đã được sử dụng trong đơn hàng, không thể xóa",
      );
    }
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.toggleActive(id, is_active);
  };
}
