import { createRouter } from "@/shared/utils/createRouter.util";
import { AttributeController } from "./attribute.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createAttributeSchema,
  updateAttributeSchema,
  createAttributeValueSchema,
  updateAttributeValueSchema,
} from "./attribute.validator";

const controller = new AttributeController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/attributes",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/attributes/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/attributes",
    handler: "create",
    middlewares: [...merchantAuth, validate(createAttributeSchema)],
  },
  {
    method: "put",
    path: "/merchant/attributes/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateAttributeSchema)],
  },
  {
    method: "delete",
    path: "/merchant/attributes/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  // ── Values ──
  {
    method: "post",
    path: "/merchant/attributes/:id/values",
    handler: "createValue",
    middlewares: [...merchantAuth, validate(createAttributeValueSchema)],
  },
  {
    method: "put",
    path: "/merchant/attributes/:id/values/:vid",
    handler: "updateValue",
    middlewares: [...merchantAuth, validate(updateAttributeValueSchema)],
  },
  {
    method: "delete",
    path: "/merchant/attributes/:id/values/:vid",
    handler: "deleteValue",
    middlewares: [...merchantAuth],
  },
]);
