import { Request, Response } from "express";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }

    // multer-storage-cloudinary types sometimes don't include 'path' in File
    // but it is where the URL resides
    const file = req.file as any;

    res.status(200).json({
      message: "Image uploaded successfully",
      data: {
        url: file.path,
        public_id: file.filename,
        size: file.size,
        format: file.mimetype,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
