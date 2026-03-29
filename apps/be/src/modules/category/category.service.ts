import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { CategoryRepository } from "./category.repository";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.validator";
import { removeVietnameseTones } from "@/shared/utils/string.util";

export class CategoryService {
  private repo: CategoryRepository;

  constructor(db: RetailClient) {
    this.repo = new CategoryRepository(db);
  }

  getAll = async () => {
    return this.repo.findAll();
  };

  getById = async (id: string) => {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException("Danh mục không tồn tại");
    return category;
  };

  getByName = async (keyword: string) => {
    const all = await this.repo.findAll();
    const normalizedKeyword = removeVietnameseTones(keyword);

    const flatten = (cats: any[]): any[] =>
      cats.flatMap((c) => [c, ...flatten(c.children ?? [])]);

    const result = flatten(all).filter((cat) =>
      removeVietnameseTones(cat.name).includes(normalizedKeyword),
    );

    if (result.length === 0)
      throw new NotFoundException("Không tìm thấy danh mục");
    return result;
  };

  create = async (dto: CreateCategoryDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing) throw new BadRequestException("Tên danh mục đã tồn tại");

    if (dto.parent_id) {
      const parent = await this.repo.findById(dto.parent_id);
      if (!parent) throw new NotFoundException("Danh mục cha không tồn tại");
      // Không cho nested quá 2 cấp
      if (parent.parent_id) {
        throw new BadRequestException("Chỉ hỗ trợ tối đa 2 cấp danh mục");
      }
    }
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateCategoryDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name);
      if (existing && existing.id !== id) {
        throw new BadRequestException("Tên danh mục đã tồn tại");
      }
    }

    if (dto.parent_id) {
      const parent = await this.repo.findById(dto.parent_id);
      const hasChildren = await this.repo.hasChildren(id);
      if (!parent) throw new NotFoundException("Danh mục cha không tồn tại");
      if (parent.parent_id) {
        throw new BadRequestException("Chỉ hỗ trợ tối đa 2 cấp danh mục");
      }
      // Không cho tự làm cha của chính mình
      if (dto.parent_id === id) {
        throw new BadRequestException("Danh mục không thể là cha của chính nó");
      }
      if (hasChildren) {
        throw new BadRequestException(
          "Danh mục có danh mục con, không thể chuyển",
        );
      }
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const hasChildren = await this.repo.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestException("Danh mục có danh mục con, không thể xóa");
    }
    const hasProducts = await this.repo.hasProducts(id);
    if (hasProducts) {
      throw new BadRequestException("Danh mục có sản phẩm, không thể xóa");
    }
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.toggleActive(id, is_active);
  };
}
