import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { StoreRepository } from "./store.repository";
import {
  CreateStoreDto,
  UpdateStoreDto,
  StoreFilterDto,
} from "./store.validator";

export class StoreService {
  private repo: StoreRepository;

  constructor(db: RetailClient) {
    this.repo = new StoreRepository(db);
  }

  getAll = async (filter: StoreFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const store = await this.repo.findById(id);
    if (!store) throw new NotFoundException("Cửa hàng không tồn tại");
    return store;
  };

  create = async (dto: CreateStoreDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing) throw new BadRequestException("Tên cửa hàng đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateStoreDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing) throw new BadRequestException("Tên cửa hàng đã tồn tại");
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const isUsed = await this.repo.isUsedInOrder(id);
    if (isUsed) {
      throw new BadRequestException(
        "Cửa hàng đang được dùng trong đơn hàng, không thể xóa",
      );
    }
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.update(id, { is_active });
  };
}
