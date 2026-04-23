import { createRouter } from "@/shared/utils/createRouter.util";
import { AddressStorefrontController } from "./address-storefront.controller";
import { extractTenant } from "@/middlewares/tenant.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validator.middleware";
import { addressSchema, updateAddressSchema } from "./address-storefront.validator";

const controller = new AddressStorefrontController();
const customerAuth = [extractTenant, authenticate, requireUserType("CUSTOMER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/addresses",
    handler: "getAddresses",
    middlewares: customerAuth,
  },
  {
    method: "post",
    path: "/storefront/addresses",
    handler: "createAddress",
    middlewares: [...customerAuth, validate(addressSchema)],
  },
  {
    method: "put",
    path: "/storefront/addresses/:id",
    handler: "updateAddress",
    middlewares: [...customerAuth, validate(updateAddressSchema)],
  },
  {
    method: "delete",
    path: "/storefront/addresses/:id",
    handler: "deleteAddress",
    middlewares: customerAuth,
  },
]);
