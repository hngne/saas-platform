import { createRouter } from "@/shared/utils/createRouter.util";
import { StoreController } from "./store.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createStoreSchema,
  updateStoreSchema,
} from "./store.validator";

const controller = new StoreController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/stores",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/stores/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/stores",
    handler: "create",
    middlewares: [...merchantAuth, validate(createStoreSchema)],
  },
  {
    method: "put",
    path: "/merchant/stores/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateStoreSchema)],
  },
  {
    method: "delete",
    path: "/merchant/stores/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/stores/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
]);
