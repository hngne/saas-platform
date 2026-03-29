import { Request, Response } from "express";
import { PromotionService } from "./promotion.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { BadRequestException } from "@/shared/exceptions";
import {
  addProductSchema,
  promotionFilterSchema,
  toggleActiveSchema,
  updateProductSchema,
} from "./promotion.validator";

const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (!val || typeof val !== "string") {
    throw new BadRequestException(`Thiếu hoặc sai định dạng param: ${key}`);
  }
  return val;
};

export class PromotionController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new PromotionService(db);
  }

  getAll = async (req: Request, res: Response) => {
    const filter = promotionFilterSchema.parse(req.query);
    const data = await this.getService(req).getAll(filter);
    res
      .status(200)
      .json(APIResponse.OK("Lấy danh sách khuyến mãi thành công", data));
  };

  getById = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).getById(id);
    res.status(200).json(APIResponse.OK("Lấy khuyến mãi thành công", data));
  };

  create = async (req: Request, res: Response) => {
    const data = await this.getService(req).create(req.body);
    res
      .status(201)
      .json(APIResponse.Created("Tạo khuyến mãi thành công", data));
  };

  update = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const data = await this.getService(req).update(id, req.body);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật khuyến mãi thành công", data));
  };

  delete = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    await this.getService(req).delete(id);
    res.status(200).json(APIResponse.OK("Xóa khuyến mãi thành công"));
  };

  toggleActive = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const { is_active } = toggleActiveSchema.parse(req.body);
    await this.getService(req).toggleActive(id, is_active);
    res.status(200).json(APIResponse.OK("Cập nhật trạng thái thành công"));
  };

  // ── Details ──────────────────────────────────

  getByProduct = async (req: Request, res: Response) => {
    const productId = getParam(req, "productId");
    const data = await this.getService(req).getByProduct(productId);
    res
      .status(200)
      .json(APIResponse.OK("Lấy khuyến mãi theo sản phẩm thành công", data));
  };

  addProduct = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const dto = addProductSchema.parse(req.body);
    const data = await this.getService(req).addProduct(id, dto);
    res
      .status(201)
      .json(
        APIResponse.Created("Thêm sản phẩm vào khuyến mãi thành công", data),
      );
  };

  updateProduct = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const productId = getParam(req, "productId");
    const dto = updateProductSchema.parse(req.body);
    const data = await this.getService(req).updateProduct(id, productId, dto);
    res
      .status(200)
      .json(APIResponse.OK("Cập nhật khuyến mãi sản phẩm thành công", data));
  };

  removeProduct = async (req: Request, res: Response) => {
    const id = getParam(req, "id");
    const productId = getParam(req, "productId");
    await this.getService(req).removeProduct(id, productId);
    res
      .status(200)
      .json(APIResponse.OK("Xóa sản phẩm khỏi khuyến mãi thành công"));
  };
}
