import { createRouter } from "@/shared/utils/createRouter.util";
import { BlogStorefrontController } from "./blog-storefront.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";

const controller = new BlogStorefrontController();

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/blogs",
    handler: "getPosts",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/blog-categories",
    handler: "getCategories",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/blogs/:id",
    handler: "getPostById",
    middlewares: [extractTenant],
  },
]);
