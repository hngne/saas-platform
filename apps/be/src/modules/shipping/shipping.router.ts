import { createRouter } from "@/shared/utils/createRouter.util";
import { ShippingController } from "./shipping.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createShippingSchema,
  updateShippingSchema,
} from "./shipping.validator";

const controller = new ShippingController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/shipping",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/shipping/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/shipping",
    handler: "create",
    middlewares: [...merchantAuth, validate(createShippingSchema)],
  },
  {
    method: "put",
    path: "/merchant/shipping/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateShippingSchema)],
  },
  {
    method: "delete",
    path: "/merchant/shipping/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/shipping/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
]);
