import { createRouter } from "@/shared/utils/createRouter.util";
import { PostCommentController } from "./post-comment.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { toggleVisibleSchema } from "./post-comment.validator";

const controller = new PostCommentController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/post-comments",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/post-comments/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/post-comments/:id/toggle",
    handler: "toggleVisible",
    middlewares: [...merchantAuth, validate(toggleVisibleSchema)],
  },
  {
    method: "delete",
    path: "/merchant/post-comments/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
]);
