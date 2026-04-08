import { generateSlug } from "@/shared/utils/generateSlug";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
} from "./blog-category.validator";

export class BlogCategoryRepository {
  constructor(private db: RetailClient) {}

  async findAll() {
    return this.db.blogCategory.findMany({
      orderBy: { created_at: "desc" },
      include: { _count: { select: { posts: true } } },
    });
  }

  async findById(id: string) {
    return this.db.blogCategory.findUnique({ where: { id } });
  }

  async findByName(name: string, excludeId?: string) {
    return this.db.blogCategory.findFirst({
      where: {
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async create(dto: CreateBlogCategoryDto) {
    const slug = await this.generateUniqueSlug(dto.name);
    return this.db.blogCategory.create({
      data: { ...dto, slug },
    });
  }

  async update(id: string, dto: UpdateBlogCategoryDto) {
    const data: any = { ...dto };
    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }
    return this.db.blogCategory.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.db.blogCategory.delete({ where: { id } });
  }

  async hasPost(id: string) {
    const count = await this.db.post.count({
      where: { blog_category_id: id },
    });
    return count > 0;
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    let slug = generateSlug(name);
    let existing = await this.db.blogCategory.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
    });
    let counter = 2;
    while (existing) {
      slug = `${generateSlug(name)}-${counter++}`;
      existing = await this.db.blogCategory.findFirst({
        where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      });
    }
    return slug;
  }
}
