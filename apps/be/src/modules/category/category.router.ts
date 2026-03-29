import { createRouter } from "@/shared/utils/createRouter.util";
import { CategoryController } from "./category.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
  toggleActiveSchema,
} from "./category.validator";

const controller = new CategoryController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/categories",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/categories/search", // ← phải trước /:id
    handler: "search",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/categories/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/categories",
    handler: "create",
    middlewares: [...merchantAuth, validate(createCategorySchema)],
  },
  {
    method: "put",
    path: "/merchant/categories/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateCategorySchema)],
  },
  {
    method: "delete",
    path: "/merchant/categories/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/categories/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth, validate(toggleActiveSchema)],
  },
]);
