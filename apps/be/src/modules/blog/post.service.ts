import { NotFoundException } from "@/shared/exceptions";
import { PrismaClient as RetailClient } from "../../../generated/retail-client";
import { PostRepository } from "./post.repository";
import { CreatePostDto, UpdatePostDto, PostFilterDto } from "./post.validator";

export class PostService {
  private repo: PostRepository;

  constructor(db: RetailClient) {
    this.repo = new PostRepository(db);
  }

  getAll = async (filter: PostFilterDto) => {
    return this.repo.findAll(filter);
  };

  getById = async (id: string) => {
    const post = await this.repo.findById(id);
    if (!post) throw new NotFoundException("Bài viết không tồn tại");
    return post;
  };

  create = async (dto: CreatePostDto, userId: string) => {
    const { tags, ...postData } = dto;
    const slug = await this.repo.generateUniqueSlug(dto.title);
    return this.repo.create(postData, slug, userId, tags ?? []);
  };

  update = async (id: string, dto: UpdatePostDto) => {
    await this.getById(id);
    const { tags, ...postData } = dto;
    let slug: string | undefined;
    if (dto.title) {
      slug = await this.repo.generateUniqueSlug(dto.title, id);
    }
    return this.repo.update(id, postData, slug, tags);
  };

  delete = async (id: string) => {
    await this.getById(id);
    return this.repo.softDelete(id);
  };

  incrementView = async (id: string) => {
    await this.getById(id);
    // Tăng view_count lên 1, dùng cho frontend khi đọc bài
    return this.repo["db"].post.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });
  };
}
