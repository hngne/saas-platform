import { Request, Response } from "express";
import { ProductService } from "./product.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import {
  productFilterSchema,
  toggleActiveSchema,
  createProductSchema,
} from "./product.validator";
import { BadRequestException, NotFoundException } from "@/shared/exceptions";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class ProductController {
  private getService(req: Request) {
    const dbName = req.tenant?.db_name ?? req.user!.dbName!;
    const db = getTenantDB(dbName);
    return new ProductService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = productFilterSchema.parse(req.query);
    // CUSTOMER chỉ thấy hàng active
    if (req.user?.userType === "CUSTOMER") {
      filter.is_active = true;
    }
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách sản phẩm thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).getById(id);

    if (req.user?.userType === "CUSTOMER" && !data?.is_active) {
      throw new NotFoundException("Sản phẩm không tồn tại hoặc đã bị ẩn");
    }
    res.status(200).json(APIResponse.OK("Lấy sản phẩm thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const rawBody = {
      ...req.body,
      base_price: parseFloat(req.body.base_price),
      has_variant: req.body.has_variant === "true",
      variants: req.body.variants ? JSON.parse(req.body.variants) : [],
    };

    const body = createProductSchema.parse(rawBody);

    const data = await this.getService(req).create(body, files);
    res.status(201).json(APIResponse.Created("Tạo sản phẩm thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const body = {
      ...req.body,
      ...(req.body.base_price && {
        base_price: parseFloat(req.body.base_price),
      }),
    };
    const data = await this.getService(req).update(id, body);
    res.status(200).json(APIResponse.OK("Cập nhật sản phẩm thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    await this.getService(req).delete(id);
    res.status(200).json(APIResponse.OK("Xóa sản phẩm thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleActive(id, is_active);
    res.status(200).json(APIResponse.OK("Cập nhật trạng thái thành công"));
  };

  // ── Variants ──────────────────────────────────

  addVariant = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).addVariant(id, req.body);
    res.status(201).json(APIResponse.Created("Thêm biến thể thành công", data));
  };

  updateVariant = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const vid = getParam(req, "vid");
    const data = await this.getService(req).updateVariant(id, vid, req.body);
    res.status(200).json(APIResponse.OK("Cập nhật biến thể thành công", data));
  };

  deleteVariant = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const vid = getParam(req, "vid");
    await this.getService(req).deleteVariant(id, vid);
    res.status(200).json(APIResponse.OK("Xóa biến thể thành công"));
  };

  toggleVariant = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const vid = getParam(req, "vid");
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleVariant(id, vid, is_active);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật trạng thái biến thể thành công"));
  };

  // ── Images ──────────────────────────────────

  deleteImage = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const imageId = getParam(req, "imageId");
    await this.getService(req).deleteImage(id, imageId);
    res.status(200).json(APIResponse.OK("Xóa ảnh thành công"));
  };
}
