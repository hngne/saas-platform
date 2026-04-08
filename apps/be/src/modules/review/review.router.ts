import { createRouter } from "@/shared/utils/createRouter.util";
import { ReviewController } from "./review.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import {
  getReviewsSchema,
  toggleVisibleSchema,
} from "./review.validator";

const controller = new ReviewController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/reviews",
    handler: "getAll",
    middlewares: [...merchantAuth, validate(getReviewsSchema)],
  },
  {
    method: "get",
    path: "/merchant/reviews/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/reviews/:id/toggle",
    handler: "toggleVisible",
    middlewares: [...merchantAuth, validate(toggleVisibleSchema)],
  },
  {
    method: "delete",
    path: "/merchant/reviews/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
]);
