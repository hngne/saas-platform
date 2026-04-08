// src/modules/review/review.repository.ts
import { PrismaClient as RetailClient } from "../../../generated/retail-client";

export class ReviewRepository {
  constructor(private readonly db: RetailClient) {}

  async findAll(params: {
    product_id?: string;
    customer_id?: string;
    rating?: number;
    is_visible?: boolean;
    page: number;
    limit: number;
  }) {
    const { product_id, customer_id, rating, is_visible, page, limit } = params;

    const where = {
      ...(product_id && { product_id }),
      ...(customer_id && { customer_id }),
      ...(rating !== undefined && { rating }),
      ...(is_visible !== undefined && { is_visible }),
    };

    const [data, total] = await Promise.all([
      this.db.review.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.review.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.db.review.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        order: {
          select: {
            id: true,
            created_at: true,
          },
        },
      },
    });
  }

  async toggleVisible(id: string, is_visible: boolean) {
    return this.db.review.update({
      where: { id },
      data: { is_visible },
    });
  }

  async delete(id: string) {
    return this.db.review.delete({
      where: { id },
    });
  }
}
