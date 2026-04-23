import { createRouter } from "@/shared/utils/createRouter.util";
import { StorefrontInfoController } from "./storefront-info.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";

const controller = new StorefrontInfoController();

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/shop-profile",
    handler: "getShopProfile",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/stores",
    handler: "getStores",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/stores/nearest",
    handler: "getNearestStores",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/geocode/reverse",
    handler: "reverseGeocode",
    middlewares: [extractTenant],
  },
  {
    method: "get",
    path: "/storefront/shipping-methods",
    handler: "getShippingMethods",
    middlewares: [extractTenant],
  },
]);

