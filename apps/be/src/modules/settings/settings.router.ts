import { createRouter } from "@/shared/utils/createRouter.util";
import { SettingsController } from "./settings.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new SettingsController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/settings",
    handler: "getSettings",
    middlewares: merchantAuth,
  },
  {
    method: "put",
    path: "/merchant/settings",
    handler: "updateSettings",
    middlewares: merchantAuth,
  },
]);
