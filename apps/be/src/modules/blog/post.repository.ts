import { generateSlug } from "@/shared/utils/generateSlug";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { CreatePostDto, UpdatePostDto, PostFilterDto } from "./post.validator";

export class PostRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: PostFilterDto) {
    const { page, limit, search, blog_category_id, status, tag } = filter;

    const where: any = {
      deleted_at: null,
      ...(search && {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      }),
      ...(blog_category_id && { blog_category_id }),
      ...(status && { status }),
      ...(tag && { tags: { some: { tag: { contains: tag } } } }),
    };

    const [data, total] = await Promise.all([
      this.db.post.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { select: { id: true, tag: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.post.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.post.findFirst({
      where: { id, deleted_at: null },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, tag: true } },
        comments: {
          where: { is_visible: true },
          include: {
            customer: {
              select: { id: true, name: true, avatar_url: true },
            },
          },
          orderBy: { created_at: "desc" },
          take: 20,
        },
        _count: { select: { comments: true } },
      },
    });
  }

  async findBySlug(slug: string, excludeId?: string) {
    return this.db.post.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
    });
  }

  async create(
    dto: Omit<CreatePostDto, "tags">,
    slug: string,
    userId: string,
    tags: string[],
  ) {
    return this.db.post.create({
      data: {
        ...dto,
        slug,
        user_id: userId,
        published_at: dto.status === "PUBLISHED" ? new Date() : null,
        tags: {
          create: tags.map((tag) => ({ tag })),
        },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, tag: true } },
      },
    });
  }

  async update(
    id: string,
    dto: Omit<UpdatePostDto, "tags">,
    slug?: string,
    tags?: string[],
  ) {
    // Nếu có tags mới thì xóa cũ tạo lại
    if (tags !== undefined) {
      await this.db.postTag.deleteMany({ where: { post_id: id } });
    }

    return this.db.post.update({
      where: { id },
      data: {
        ...dto,
        ...(slug && { slug }),
        ...(dto.status === "PUBLISHED" && { published_at: new Date() }),
        ...(tags !== undefined && {
          tags: { create: tags.map((tag) => ({ tag })) },
        }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, tag: true } },
      },
    });
  }

  async softDelete(id: string) {
    return this.db.post.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async generateUniqueSlug(name: string, excludeId?: string) {
    let slug = generateSlug(name);
    let existing = await this.findBySlug(slug, excludeId);
    let counter = 2;
    while (existing) {
      slug = `${generateSlug(name)}-${counter++}`;
      existing = await this.findBySlug(slug, excludeId);
    }
    return slug;
  }
}
