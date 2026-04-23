import { createRouter } from "@/shared/utils/createRouter.util";
import { CustomerAuthController } from "./customer-auth.controller";
import { validate } from "@/middlewares/validator.middleware";
import { 
  customerRegisterSchema, 
  customerLoginSchema,
  customerRefreshSchema,
  updateProfileSchema,
  changePasswordSchema 
} from "./customer-auth.validator";
import { extractTenant } from "@/middlewares/tenant.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new CustomerAuthController();
const customerAuth = [authenticate, requireUserType("CUSTOMER")];

// Mọi route Storefront đều cần biết đang thao tác trên Cửa hàng (Tenant) nào.
export default createRouter(controller, [
  {
    method: "post",
    path: "/storefront/auth/register",
    handler: "register",
    middlewares: [extractTenant, validate(customerRegisterSchema)],
  },
  {
    method: "post",
    path: "/storefront/auth/login",
    handler: "login",
    middlewares: [extractTenant, validate(customerLoginSchema)],
  },
  {
    method: "post",
    path: "/storefront/auth/refresh",
    handler: "refresh",
    middlewares: [validate(customerRefreshSchema)],
  },
  {
    method: "post",
    path: "/storefront/auth/logout",
    handler: "logout",
    middlewares: [...customerAuth],
  },
  {
    method: "get",
    path: "/storefront/auth/profile",
    handler: "getProfile",
    middlewares: [...customerAuth],
  },
  {
    method: "put",
    path: "/storefront/auth/profile",
    handler: "updateProfile",
    middlewares: [...customerAuth, validate(updateProfileSchema)],
  },
  {
    method: "put",
    path: "/storefront/auth/password",
    handler: "changePassword",
    middlewares: [...customerAuth, validate(changePasswordSchema)],
  },
]);
