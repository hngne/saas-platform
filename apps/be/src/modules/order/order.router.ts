import { createRouter } from "@/shared/utils/createRouter.util";
import { OrderController } from "./order.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new OrderController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/orders",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/orders/count-by-status", // ← trước /:id
    handler: "countByStatus",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/orders/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/orders/:id/status",
    handler: "updateStatus",
    middlewares: [...merchantAuth],
  },
  // Không có DELETE — merchant hủy đơn qua updateStatus → CANCELLED
]);
