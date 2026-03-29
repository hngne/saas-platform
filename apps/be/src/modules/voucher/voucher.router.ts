import { createRouter } from "@/shared/utils/createRouter.util";
import { VoucherController } from "./voucher.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { createVoucherSchema, updateVoucherSchema } from "./voucher.validator";

const controller = new VoucherController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/vouchers",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/vouchers/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/vouchers",
    handler: "create",
    middlewares: [...merchantAuth, validate(createVoucherSchema)],
  },
  {
    method: "put",
    path: "/merchant/vouchers/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateVoucherSchema)],
  },
  {
    method: "delete",
    path: "/merchant/vouchers/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/vouchers/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
]);
