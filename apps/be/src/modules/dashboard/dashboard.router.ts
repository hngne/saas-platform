import { createRouter } from "@/shared/utils/createRouter.util";
import { DashboardController } from "./dashboard.controller";
import { authenticate, requireUserType } from "@/middlewares/auth.middleware";

const controller = new DashboardController();
const merchantAuth = [authenticate, requireUserType("USER")];

export default createRouter(controller, [
  {
    method: "get",
    path: "/merchant/dashboard/summary",
    handler: "getSummary",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/dashboard/revenue",
    handler: "getRevenue",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/dashboard/top-selling",
    handler: "getTopSelling",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/dashboard/top-not-selling",
    handler: "getTopNotSelling",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/dashboard/export-excel",
    handler: "exportExcel",
    middlewares: [...merchantAuth],
  },
  {
    method: "get",
    path: "/merchant/dashboard/export-pdf",
    handler: "exportPdf",
    middlewares: [...merchantAuth],
  },
]);
