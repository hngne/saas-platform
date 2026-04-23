import { createRouter } from "@/shared/utils/createRouter.util";
import { ChatController } from "./chat.controller";
import { authenticate } from "@/middlewares/auth.middleware";

const controller = new ChatController();

export default createRouter(controller, [
  {
    method: "post",
    path: "/chat/send",
    handler: "sendMessage",
    middlewares: [authenticate],
  },
  {
    method: "get",
    path: "/chat/sessions",
    handler: "getSessions",
    middlewares: [authenticate],
  },
  {
    method: "get",
    path: "/chat/sessions/:sessionId/messages",
    handler: "getHistory",
    middlewares: [authenticate],
  },
]);
