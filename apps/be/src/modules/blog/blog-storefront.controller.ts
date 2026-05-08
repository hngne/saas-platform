import { Request, Response } from "express";
import { PostService } from "./post.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { NotFoundException } from "@/shared/exceptions";
import { CacheService } from "@/configs/cache.service";

const cache = new CacheService();

export class BlogStorefrontController {
  private getPostService(req: Request) {
    const db = getTenantDB(req.tenant!.db_name);
    return new PostService(db);
  }

  getPosts = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const blog_category_id = req.query.blog_category_id as string | undefined;
    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;

    const cacheKey = `blogs:${tid}:list:${page}:${limit}:${blog_category_id || ""}:${tag || ""}:${search || ""}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy danh sách bài viết thành công", cached));
    }

    const service = this.getPostService(req);
    const data = await service.getAll({
      page,
      limit,
      status: "PUBLISHED",
      blog_category_id,
      tag,
      search,
    });

    await cache.set(cacheKey, data, 600);

    res.status(200).json(APIResponse.OK("Lấy danh sách bài viết thành công", data));
  };

  getPostById = async (req: Request, res: Response) => {
    const service = this.getPostService(req);
    const data = await service.getByIdentifier(req.params.id as string);
    if (!data || data.status !== "PUBLISHED") {
      throw new NotFoundException("Bài viết không tồn tại");
    }

    const db = getTenantDB(req.tenant!.db_name);
    await db.post.update({
      where: { id: data.id },
      data: { view_count: { increment: 1 } },
    });

    res.status(200).json(APIResponse.OK("Lấy bài viết thành công", data));
  };

  getCategories = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const cacheKey = `blog-categories:${tid}:active`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy danh mục blog thành công", cached));
    }

    const db = getTenantDB(req.tenant!.db_name);
    const data = await db.blogCategory.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });

    await cache.set(cacheKey, data, 1800);

    res.status(200).json(APIResponse.OK("Lấy danh mục blog thành công", data));
  };
}
