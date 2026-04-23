import { createRouter } from "@/shared/utils/createRouter.util";
import { ReviewStorefrontController } from "./review-storefront.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new ReviewStorefrontController();
const customerAuth = [authenticate, requireUserType("CUSTOMER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/products/:productId/reviews",
    handler: "getByProduct",
    middlewares: [extractTenant], // Public — ai cũng xem được
  },
  {
    method: "post",
    path: "/storefront/reviews",
    handler: "create",
    middlewares: [...customerAuth], // Phải đăng nhập
  },
]);
