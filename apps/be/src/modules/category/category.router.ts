import { createRouter } from "@/shared/utils/createRouter.util";
import { CategoryController } from "./category.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { uploadCategory } from "@/middlewares/upload.middleware";
import { Request, Response, NextFunction } from "express";
import {
  createCategorySchema,
  updateCategorySchema,
  toggleActiveSchema,
} from "./category.validator";

const controller = new CategoryController();
const merchantAuth = [authenticate, requireUserType("USER")];

// Middleware: parse multipart string fields to proper types
const parseMultipart = (req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body.sort_order === "string") {
    req.body.sort_order = parseInt(req.body.sort_order, 10) || 0;
  }
  if (typeof req.body.is_active === "string") {
    req.body.is_active = req.body.is_active === "true";
  }
  // Remove empty parent_id
  if (req.body.parent_id === "" || req.body.parent_id === "null") {
    req.body.parent_id = null;
  }
  next();
};

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
    middlewares: [
      ...merchantAuth,
      uploadCategory.single("image"),
      parseMultipart,
      validate(createCategorySchema),
    ],
  },
  {
    method: "put",
    path: "/merchant/categories/:id",
    handler: "update",
    middlewares: [
      ...merchantAuth,
      uploadCategory.single("image"),
      parseMultipart,
      validate(updateCategorySchema),
    ],
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
