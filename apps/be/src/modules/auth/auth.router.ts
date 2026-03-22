import { createRouter } from "@/shared/utils/createRouter.util";
import { AuthController } from "./auth.controller";
import { validate } from "@/middlewares/validator.middleware";
import { loginSchema, merchantRegisterSchema } from "./auth.validators";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { extractTenant } from "@/middlewares/tenant.middleware";

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
  {
    method: "post",
    path: "/merchant/auth/register",
    handler: "merchantRegister",
    middlewares: [validate(merchantRegisterSchema)],
  },
  {
    method: "post",
    path: "/merchant/auth/login",
    handler: "merchantLogin",
    middlewares: [extractTenant, validate(loginSchema)],
  },
  {
    method: "post",
    path: "/merchant/auth/login-global",
    handler: "merchantLoginGlobal",
    middlewares: [validate(loginSchema)],
  },
  {
    method: "post",
    path: "/merchant/auth/logout",
    handler: "merchantLogout",
    middlewares: [authenticate, requireUserType("USER")],
  },
  {
    method: "post",
    path: "/merchant/auth/refresh",
    handler: "refreshtoken",
  },
]);
