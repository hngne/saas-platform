import { BadRequestException, NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { BlogCategoryRepository } from "./blog-category.repository";
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
} from "./blog-category.validator";

export class BlogCategoryService {
  private repo: BlogCategoryRepository;

  constructor(db: RetailClient) {
    this.repo = new BlogCategoryRepository(db);
  }

  getAll = async () => {
    return this.repo.findAll();
  };

  getById = async (id: string) => {
    const cat = await this.repo.findById(id);
    if (!cat) throw new NotFoundException("Danh mục blog không tồn tại");
    return cat;
  };

  create = async (dto: CreateBlogCategoryDto) => {
    const existing = await this.repo.findByName(dto.name);
    if (existing)
      throw new BadRequestException("Tên danh mục blog đã tồn tại");
    return this.repo.create(dto);
  };

  update = async (id: string, dto: UpdateBlogCategoryDto) => {
    await this.getById(id);
    if (dto.name) {
      const existing = await this.repo.findByName(dto.name, id);
      if (existing)
        throw new BadRequestException("Tên danh mục blog đã tồn tại");
    }
    return this.repo.update(id, dto);
  };

  delete = async (id: string) => {
    await this.getById(id);
    const hasPost = await this.repo.hasPost(id);
    if (hasPost) {
      throw new BadRequestException(
        "Danh mục đang có bài viết, không thể xóa",
      );
    }
    return this.repo.delete(id);
  };

  toggleActive = async (id: string, is_active: boolean) => {
    await this.getById(id);
    return this.repo.update(id, { is_active });
  };
}
