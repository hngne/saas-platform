import { NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { PostCommentRepository } from "./post-comment.repository";
import { CommentFilterDto } from "./post-comment.validator";

export class PostCommentService {
  private repo: PostCommentRepository;

  constructor(db: RetailClient) {
    this.repo = new PostCommentRepository(db);
  }

  getAll = async (filter: CommentFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const comment = await this.repo.findById(id);
    if (!comment) throw new NotFoundException("Bình luận không tồn tại");
    return comment;
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
