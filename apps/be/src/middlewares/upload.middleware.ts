import multer from "multer";
import { productStorage, storeStorage } from "@/configs/cloudinary";
import { Request, Response, NextFunction } from "express";

export const uploadProduct = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const uploadStore = multer({
  storage: storeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export const handleSingleUpload = (uploader: multer.Multer, fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    uploader.single(fieldName)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large (max 5MB)" });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};
