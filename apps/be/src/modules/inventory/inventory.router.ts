import { createRouter } from "@/shared/utils/createRouter.util";
import { InventoryController } from "./inventory.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new InventoryController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/inventory",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/inventory/logs", // ← trước /:variantId
    handler: "getLogs",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/inventory/low-stock", // ← cho AI dùng sau
    handler: "getLowStock",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/inventory/:variantId",
    handler: "getByVariantId",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/inventory/adjust",
    handler: "adjust",
    middlewares: [...merchantAuth],
  },
]);
