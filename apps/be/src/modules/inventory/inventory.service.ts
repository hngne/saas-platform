import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { InventoryRepository } from "./inventory.repository";
import {
  AdjustInventoryDto,
  InventoryFilterDto,
  LogFilterDto,
} from "./inventory.validator";

export class InventoryService {
  private repo: InventoryRepository;

  constructor(db: RetailClient) {
    this.repo = new InventoryRepository(db);
  }

  getAll = async (filter: InventoryFilterDto) => {
    return this.repo.findAll(filter);
  };

  getByVariantId = async (variantId: string) => {
    const variant = await this.repo.findVariantById(variantId);
    if (!variant) throw new NotFoundException("Biến thể không tồn tại");
    const logs = await this.repo.findRecentLogs(variantId);
    return { ...variant, recent_logs: logs };
  };

  getLogs = async (filter: LogFilterDto) => {
    return this.repo.findLogs(filter);
  };

  adjust = async (dto: AdjustInventoryDto, userId: string) => {
    const variant = await this.repo.findVariantById(dto.variant_id);
    if (!variant) throw new NotFoundException("Biến thể không tồn tại");

    // OUT không được xuất quá tồn kho
    if (dto.type === "OUT" && variant.stock < dto.quantity) {
      throw new BadRequestException(
        `Tồn kho không đủ! Hiện có ${variant.stock}, cần xuất ${dto.quantity}`,
      );
    }

    // ADJUST không được set âm
    if (dto.type === "ADJUST" && dto.quantity < 0) {
      throw new BadRequestException("Số lượng điều chỉnh không được âm");
    }

    const result = await this.repo.adjustStock(dto, userId);
    if (!result) throw new BadRequestException("Điều chỉnh kho thất bại");
    return result;
  };

  getLowStock = async () => {
    return this.repo.findLowStockVariants();
  };
}
