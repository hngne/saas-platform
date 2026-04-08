import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { buildPaginationMeta } from "@/shared/utils/pagination.util";
import { CommentFilterDto } from "./post-comment.validator";

export class PostCommentRepository {
  constructor(private db: RetailClient) {}

  async findAll(filter: CommentFilterDto) {
    const { page, limit, post_id, is_visible } = filter;

    const where: any = {
      ...(post_id && { post_id }),
      ...(is_visible !== undefined && { is_visible }),
    };

    const [data, total] = await Promise.all([
      this.db.postComment.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
          post: {
            select: { id: true, title: true, slug: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.postComment.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return this.db.postComment.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, avatar_url: true },
        },
        post: {
          select: { id: true, title: true, slug: true },
        },
      },
    });
  }

  async toggleVisible(id: string, is_visible: boolean) {
    return this.db.postComment.update({
      where: { id },
      data: { is_visible },
    });
  }

  async delete(id: string) {
    return this.db.postComment.delete({ where: { id } });
  }
}
