import { AdminController } from "./admin.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { createRouter } from "@/shared/utils/createRouter.util";

const controller = new AdminController();
const adminAuth = [authenticate, requireUserType("ADMIN")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/admin/profile",
    handler: "getProfile",
    middlewares: adminAuth,
  },
  {
    method: "get",
    path: "/admin/stats",
    handler: "getStats",
    middlewares: adminAuth,
  },
]);
