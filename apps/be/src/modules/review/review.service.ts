import { NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { ReviewRepository } from "./review.repository";

export class ReviewService {
  private repo: ReviewRepository;

  constructor(db: RetailClient) {
    this.repo = new ReviewRepository(db);
  }

  getAll = async (params: {
    product_id?: string;
    customer_id?: string;
    rating?: number;
    is_visible?: boolean;
    page: number;
    limit: number;
  }) => {
    return this.repo.findAll(params);
  };

  getById = async (id: string) => {
    const review = await this.repo.findById(id);
    if (!review) throw new NotFoundException("Đánh giá không tồn tại");
    return review;
  };

  toggleVisible = async (id: string, is_visible: boolean) => {
    await this.getById(id);
    return this.repo.toggleVisible(id, is_visible);
  };

  delete = async (id: string) => {
    await this.getById(id);
    return this.repo.delete(id);
  };
}
