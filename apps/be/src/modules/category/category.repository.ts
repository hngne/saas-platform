import { generateSlug } from "@/shared/utils/generateSlug";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.validator";

export class CategoryRepository {
  constructor(private db: RetailClient) {}

  async findAll() {
    return this.db.category.findMany({
      where: {
        parent_id: null,
      },
      include: {
        children: true,
      },
      orderBy: {
        sort_order: "asc",
      },
    });
  }

  async findById(id: string) {
    return this.db.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
      },
    });
  }

  async findByName(name: string) {
    return this.db.category.findFirst({
      where: { name },
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    return this.db.category.create({
      data: { ...dto, slug },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const data: any = { ...dto };
    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }
    return this.db.category.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.db.category.delete({ where: { id } });
  }

  async toggleActive(id: string, is_active: boolean) {
    return this.db.category.update({ where: { id }, data: { is_active } });
  }

  async hasChildren(id: string) {
    const count = await this.db.category.count({ where: { parent_id: id } });
    return count > 0;
  }

  async hasProducts(id: string) {
    const count = await this.db.product.count({ where: { category_id: id } });
    return count > 0;
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    let slug = generateSlug(name);
    let existing = await this.db.category.findUnique({ where: { slug } });
    let counter = 1;
    while (existing && existing.id !== excludeId) {
      slug = `${generateSlug(name)}-${counter++}`;
      existing = await this.db.category.findUnique({ where: { slug } });
    }
    return slug;
  }
}
