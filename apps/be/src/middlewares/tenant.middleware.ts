import prisma from "@/configs/database";
import { NextFunction, Request, Response } from "express";

const EXCLUDED_SLUGS = ["admin", "platform", "localhost", "www"];
export const extractTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const hostname = req.hostname;
  const slug = hostname.split(".")[0];

  if (EXCLUDED_SLUGS.includes(slug)) {
    return next();
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      profile: true,
    },
  });

  if (!tenant) {
    return res.status(404).json({ message: "Cửa hàng không tồn tại" });
  }

  if (tenant.status === "BANNED") {
    return res.status(403).json({ message: "Cửa hàng dã bị khóa" });
  }

  req.tenant = tenant;
  next();
};
