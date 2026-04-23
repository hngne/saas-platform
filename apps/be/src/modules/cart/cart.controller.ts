import { Request, Response } from "express";
import { CartService } from "./cart.service";
import { getTenantDB } from "@/configs/tenant-db";
import { APIResponse } from "@/shared/utils/response.util";
import { AddCartItemDto, UpdateCartItemDto } from "./cart.validator";

export class CartController {
  private getService(req: Request) {
    const db = getTenantDB(req.user!.dbName!);
    return new CartService(db);
  }

  getCart = async (req: Request, res: Response) => {
    const data = await this.getService(req).getCart(req.user!.sub);
    res.status(200).json(APIResponse.OK("Lấy giỏ hàng thành công", data));
  };

  addItem = async (req: Request, res: Response) => {
    const dto = req.body as AddCartItemDto;
    const data = await this.getService(req).addItem(req.user!.sub, dto);
    res.status(201).json(APIResponse.Created("Thêm vào giỏ hàng thành công", data));
  };

  updateItem = async (req: Request, res: Response) => {
    const { quantity } = req.body as UpdateCartItemDto;
    const data = await this.getService(req).updateItem(
      req.user!.sub,
      req.params.itemId as string,
      quantity,
    );
    res.status(200).json(APIResponse.OK("Cập nhật giỏ hàng thành công", data));
  };

  removeItem = async (req: Request, res: Response) => {
    await this.getService(req).removeItem(req.user!.sub, req.params.itemId as string);
    res.status(200).json(APIResponse.OK("Xóa sản phẩm khỏi giỏ thành công"));
  };
}
