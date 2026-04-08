import { createRouter } from "@/shared/utils/createRouter.util";
import { PostController } from "./post.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { createPostSchema, updatePostSchema } from "./post.validator";

const controller = new PostController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/posts",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/posts/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "post",
    path: "/merchant/posts",
    handler: "create",
    middlewares: [...merchantAuth, validate(createPostSchema)],
  },
  {
    method: "put",
    path: "/merchant/posts/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updatePostSchema)],
  },
  {
    method: "delete",
    path: "/merchant/posts/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
]);
