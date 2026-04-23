import { createRouter } from "@/shared/utils/createRouter.util";
import { CategoryStorefrontController } from "./category-storefront.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";

const controller = new CategoryStorefrontController();

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/categories",
    handler: "getAll",
    middlewares: [extractTenant],
  },
]);
