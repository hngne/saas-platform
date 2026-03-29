import { createRouter } from "@/shared/utils/createRouter.util";
import { ProductController } from "./product.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { uploadProduct } from "@/middlewares/upload.middleware";
import {
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
} from "./product.validator";
import multer from "multer";
import { extractTenant } from "@/middlewares/tenant.middleware";

const controller = new ProductController();
const viewAuth = [
  extractTenant,
  authenticate,
  requireUserType("USER", "CUSTOMER"),
];
const merchantAuth = [extractTenant, authenticate, requireUserType("USER")];

// multer array upload cho product images
const uploadProductImages = (req: any, res: any, next: any) => {
  uploadProduct.array("images", 10)(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/products",
    handler: "getAll",
    middlewares: [...viewAuth],
  },
  {
    method: "get",
    path: "/merchant/products/:id",
    handler: "getById",
    middlewares: [...viewAuth],
  },
  {
    method: "post",
    path: "/merchant/products",
    handler: "create",
    middlewares: [...merchantAuth, uploadProductImages],
  },
  {
    method: "put",
    path: "/merchant/products/:id",
    handler: "update",
    middlewares: [...merchantAuth, validate(updateProductSchema)],
  },
  {
    method: "delete",
    path: "/merchant/products/:id",
    handler: "delete",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/products/:id/toggle",
    handler: "toggleActive",
    middlewares: [...merchantAuth],
  },
  // ── Variants ──
  {
    method: "post",
    path: "/merchant/products/:id/variants",
    handler: "addVariant",
    middlewares: [...merchantAuth, validate(createVariantSchema)],
  },
  {
    method: "put",
    path: "/merchant/products/:id/variants/:vid",
    handler: "updateVariant",
    middlewares: [...merchantAuth, validate(updateVariantSchema)],
  },
  {
    method: "delete",
    path: "/merchant/products/:id/variants/:vid",
    handler: "deleteVariant",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/products/:id/variants/:vid/toggle",
    handler: "toggleVariant",
    middlewares: [...merchantAuth],
  },
  // ── Images ──
  {
    method: "delete",
    path: "/merchant/products/:id/images/:imageId",
    handler: "deleteImage",
    middlewares: [...merchantAuth],
  },
]);
