import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { APIResponse } from "../shared/utils/response.util";

type ValidateTarget = "body" | "params" | "query";

export const validate = (
  schema: ZodSchema,
  target: ValidateTarget = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      res
        .status(400)
        .json(APIResponse.BadRequest("Dữ liệu không hợp lệ", errors));
      return;
    }

    // Ghi đè lại data đã được validate + transform
    req[target] = result.data;
    next();
  };
};
