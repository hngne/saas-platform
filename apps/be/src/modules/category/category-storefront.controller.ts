import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { CacheService } from "@/configs/cache.service";

const cache = new CacheService();

export class CategoryStorefrontController {
  private getService(req: Request) {
    const db = getTenantDB(req.tenant!.db_name);
    return new CategoryService(db);
  }

  /** Lấy cây danh mục (chỉ lấy is_active = true) — cache 10 phút */
  getAll = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const cacheKey = `categories:${tid}:active`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy danh mục thành công", cached));
    }

    const all = await this.getService(req).getAll();
    const filterActive = (cats: any[]): any[] =>
      cats
        .filter((c) => c.is_active)
        .map((c) => ({ ...c, children: filterActive(c.children || []) }));
    const result = filterActive(all);

    await cache.set(cacheKey, result, 600);

    res.status(200).json(APIResponse.OK("Lấy danh mục thành công", result));
  };
}
