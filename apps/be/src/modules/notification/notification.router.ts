import { createRouter } from "@/shared/utils/createRouter.util";
import { NotificationController } from "./notification.controller";
import { authenticate } from "@/middlewares/auth.middleware";

const controller = new NotificationController();

export default createRouter(controller, [
  {
    method: "get",
    path: "/notifications",
    handler: "getMyNotifications",
    middlewares: [authenticate],
  },
  {
    method: "put",
    path: "/notifications/:id/read",
    handler: "markAsRead",
    middlewares: [authenticate],
  },
  {
    method: "put",
    path: "/notifications/read-all",
    handler: "markAllAsRead",
    middlewares: [authenticate],
  },
]);
