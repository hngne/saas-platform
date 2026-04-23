import { createRouter } from "@/shared/utils/createRouter.util";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validator.middleware";
import { CustomerController } from "./customer.controller";
import { updateCustomerStatusSchema } from "./customer.validator";

const controller = new CustomerController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/customers",
    handler: "getAll",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/customers/summary",
    handler: "getSummary",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/customers/:id",
    handler: "getById",
    middlewares: [...merchantAuth],
  },
  {
    method: "patch",
    path: "/merchant/customers/:id/status",
    handler: "updateStatus",
    middlewares: [...merchantAuth, validate(updateCustomerStatusSchema)],
  },
]);
