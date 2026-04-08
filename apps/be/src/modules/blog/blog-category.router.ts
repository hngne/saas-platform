import { createRouter } from "@/shared/utils/createRouter.util";
import { BlogCategoryController } from "./blog-category.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  createBlogCategorySchema,
  updateBlogCategorySchema,
} from "./blog-category.validator";

const controller = new BlogCategoryController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/blog-categories",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/blog-categories/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/blog-categories",
    handler: "create",
    middlewares: [...merchantAuth, validate(createBlogCategorySchema)],
  },
  {
    method: "put",
    path: "/merchant/blog-categories/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateBlogCategorySchema)],
  },
  {
    method: "delete",
    path: "/merchant/blog-categories/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/blog-categories/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
]);
