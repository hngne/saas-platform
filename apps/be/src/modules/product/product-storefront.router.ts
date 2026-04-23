import { createRouter } from "@/shared/utils/createRouter.util";
import { ProductStorefrontController } from "./product-storefront.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";

const controller = new ProductStorefrontController();

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/products",
    handler: "getAll",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/products/:id",
    handler: "getById",
    middlewares: [extractTenant],
  },
]);
