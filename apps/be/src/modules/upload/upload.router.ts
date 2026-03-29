import { Router } from "express";
import { uploadImage } from "./upload.controller";
import {
  handleSingleUpload,
  uploadProduct,
  uploadStore,
} from "@/middlewares/upload.middleware";
import { authenticate } from "@/middlewares/auth.middleware";

const uploadRouter = Router();

// Route: POST /api/upload/product
uploadRouter.post(
  "/upload/product",
  authenticate,
  handleSingleUpload(uploadProduct, "image"),
  uploadImage,
);

// Route: POST /api/upload/store
uploadRouter.post(
  "/upload/store",
  authenticate,
  handleSingleUpload(uploadStore, "image"),
  uploadImage,
);

export default uploadRouter;
