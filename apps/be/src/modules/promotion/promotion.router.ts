import { createRouter } from "@/shared/utils/createRouter.util";
import { PromotionController } from "./promotion.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createPromotionSchema,
  updatePromotionSchema,
} from "./promotion.validator";

const controller = new PromotionController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/promotions",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/promotions/product/:productId", // ← trước /:id
    handler: "getByProduct",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/promotions/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/promotions",
    handler: "create",
    middlewares: [...merchantAuth, validate(createPromotionSchema)],
  },
  {
    method: "put",
    path: "/merchant/promotions/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updatePromotionSchema)],
  },
  {
    method: "delete",
    path: "/merchant/promotions/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/promotions/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
  // ── Details ──
  {
    method: "post",
    path: "/merchant/promotions/:id/products",
    handler: "addProduct",
    middlewares: [...merchantAuth],
  },
  {
    method: "put",
    path: "/merchant/promotions/:id/products/:productId",
    handler: "updateProduct",
    middlewares: [...merchantAuth],
  },
  {
    method: "delete",
    path: "/merchant/promotions/:id/products/:productId",
    handler: "removeProduct",
    middlewares: [...merchantAuth],
  },
]);
