import { TenantController } from "./tenant.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { createRouter } from "@/shared/utils/createRouter.util";

const controller = new TenantController();
const adminAuth = [authenticate, requireUserType("ADMIN")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/admin/tenants",
    handler: "getAll",
    middlewares: adminAuth,
  },
  {
    method: "get",
    path: "/admin/tenants/:id",
    handler: "getById",
    middlewares: adminAuth,
  },
  {
    method: "patch",
    path: "/admin/tenants/:id/ban",
    handler: "banTenant",
    middlewares: adminAuth,
  },
  {
    method: "patch",
    path: "/admin/tenants/:id/unban",
    handler: "unbanTenant",
    middlewares: adminAuth,
  },
]);
