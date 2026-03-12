import { createRouter } from "@/shared/utils/createRouter.util";
import { AuthController } from "./auth.controller";
import { validate } from "@/middlewares/validator.middleware";
import { loginSchema } from "./auth.validators";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new AuthController();
export default createRouter(controller, [
  {
    method: "post",
    path: "/admin/auth/login",
    handler: "adminlogin",
    middlewares: [validate(loginSchema)],
  },
  {
    method: "post",
    path: "/admin/auth/register-temp",
    handler: "adminRegisterTemp",
  },
  {
    method: "post",
    path: "/admin/auth/logout",
    handler: "adminlogout",
    middlewares: [authenticate, requireUserType("ADMIN")],
  },
  {
    method: "post",
    path: "/admin/auth/refresh",
    handler: "refreshtoken",
  },
]);
