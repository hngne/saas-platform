import { Request, Response } from "express";
import { ProductService } from "./product.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { productFilterSchema } from "./product.validator";
import { NotFoundException } from "@/shared/exceptions";
import { CacheService } from "@/configs/cache.service";

const cache = new CacheService();

export class ProductStorefrontController {
  private getService(req: Request) {
    const db = getTenantDB(req.tenant!.db_name);
    return new ProductService(db);
  }

  /** Danh sách sản phẩm — cache 5 phút */
  getAll = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const filter = productFilterSchema.parse(req.query);
    filter.is_active = true;

    const cacheKey = `products:${tid}:list:${JSON.stringify(filter)}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(APIResponse.OK("Lấy danh sách sản phẩm thành công", cached));
    }

    const data = await this.getService(req).getAll(filter);
    await cache.set(cacheKey, data, 300);

    res.status(200).json(APIResponse.OK("Lấy danh sách sản phẩm thành công", data));
  };

  /** Chi tiết sản phẩm — cache 5 phút */
  getById = async (req: Request, res: Response) => {
    const tid = req.tenant!.id;
    const productId = req.params.id as string;
    const cacheKey = `products:${tid}:detail:${productId}`;

    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      if (!cached.is_active) throw new NotFoundException("Sản phẩm không tồn tại hoặc đã bị ẩn");
      return res.status(200).json(APIResponse.OK("Lấy sản phẩm thành công", cached));
    }

    const data = await this.getService(req).getById(productId);
    if (!data || !data.is_active) {
      throw new NotFoundException("Sản phẩm không tồn tại hoặc đã bị ẩn");
    }

    await cache.set(cacheKey, data, 300);
    res.status(200).json(APIResponse.OK("Lấy sản phẩm thành công", data));
  };
}
