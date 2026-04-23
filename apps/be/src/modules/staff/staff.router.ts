import { createRouter } from "@/shared/utils/createRouter.util";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { requireRole } from "@/middlewares/role.middleware";
import { validate } from "@/middlewares/validator.middleware";
import { StaffController } from "./staff.controller";
import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from "./staff.validator";

const controller = new StaffController();
const merchantAuth = [authenticate, requireUserType("USER")];
const ownerOnly = [...merchantAuth, requireRole("OWNER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/staff",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/staff/summary",
    handler: "getSummary",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/staff/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/staff",
    handler: "create",
    middlewares: [...ownerOnly, validate(createStaffSchema)],
  },
  {
    method: "put",
    path: "/merchant/staff/:id",
    handler: "update",
    middlewares: [...ownerOnly, validate(updateStaffSchema)],
  },
  {
    method: "patch",
    path: "/merchant/staff/:id/status",
    handler: "updateStatus",
    middlewares: [...ownerOnly, validate(updateStaffStatusSchema)],
  },
  {
    method: "delete",
    path: "/merchant/staff/:id",
    handler: "delete",
    middlewares: [...ownerOnly],
  },
]);
