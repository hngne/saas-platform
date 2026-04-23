import { createRouter } from "@/shared/utils/createRouter.util";
import { OrderStorefrontController } from "./order-storefront.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { extractTenant } from "@/middlewares/tenant.middleware";
import { validate } from "@/middlewares/validator.middleware";
import { checkoutSchema, validateVoucherSchema } from "./order-storefront.validator";

const controller = new OrderStorefrontController();
const customerAuth = [extractTenant, authenticate, requireUserType("CUSTOMER")];

export default createRouter(controller, [
  {
    method: "post",
    path: "/storefront/checkout/voucher",
    handler: "validateVoucher",
    middlewares: [extractTenant, validate(validateVoucherSchema)],
  },
  {
    method: "post",
    path: "/storefront/checkout",
    handler: "checkout",
    middlewares: [...customerAuth, validate(checkoutSchema)],
  },
  {
    method: "get",
    path: "/storefront/orders",
    handler: "getMyOrders",
    middlewares: [...customerAuth],
  },
  {
    method: "get",
    path: "/storefront/orders/:id",
    handler: "getMyOrderById",
    middlewares: [...customerAuth],
  },
  {
    method: "patch",
    path: "/storefront/orders/:id/confirm-received",
    handler: "confirmReceived",
    middlewares: [...customerAuth],
  },
]);
