import { createRouter } from "@/shared/utils/createRouter.util";
import { CartController } from "./cart.controller";
import { validate } from "@/middlewares/validator.middleware";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validator";

const controller = new CartController();
const customerAuth = [authenticate, requireUserType("CUSTOMER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/storefront/cart",
    handler: "getCart",
    middlewares: [...customerAuth],
  },
  {
    method: "post",
    path: "/storefront/cart/items",
    handler: "addItem",
    middlewares: [...customerAuth, validate(addCartItemSchema)],
  },
  {
    method: "put",
    path: "/storefront/cart/items/:itemId",
    handler: "updateItem",
    middlewares: [...customerAuth, validate(updateCartItemSchema)],
  },
  {
    method: "delete",
    path: "/storefront/cart/items/:itemId",
    handler: "removeItem",
    middlewares: [...customerAuth],
  },
]);
