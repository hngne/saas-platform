import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { ShippingRepository } from "./shipping.repository";
import { CreateShippingDto, UpdateShippingDto } from "./shipping.validator";

export class ShippingService {
  private repo: ShippingRepository;

  constructor(db: RetailClient) {
    this.repo = new ShippingRepository(db);
  }

  getAll = async () => {
    return this.repo.findAll();
  };

  getById = async (id: string) => {
    const shipping = await this.repo.findById(id);
    if (!shipping)
      throw new NotFoundException("Phương thức vận chuyển không tồn tại");
    return shipping;
  };

  create = async (dto: CreateShippingDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing)
      throw new BadRequestException("Tên phương thức vận chuyển đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateShippingDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing)
        throw new BadRequestException("Tên phương thức vận chuyển đã tồn tại");
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const isUsed = await this.repo.isUsedInOrder(id);
    if (isUsed) {
      throw new BadRequestException(
        "Phương thức đang được dùng trong đơn hàng, không thể xóa",
      );
    }
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.update(id, { is_active });
  };
}
