import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Storage cho product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shopflow/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto:best" }],
  } as any,
});

// Storage cho store assets (logo, banner, favicon)
const storeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shopflow/stores",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [{ width: 2880, height: 1200, crop: "limit", quality: "auto:best" }],
  } as any,
});

// Storage cho category images
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shopflow/categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1400, height: 1400, crop: "limit", quality: "auto:best" }],
  } as any,
});

export { cloudinary, productStorage, storeStorage, categoryStorage };
