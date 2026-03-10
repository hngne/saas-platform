import { RequestHandler, Router } from "express";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface RouteConfig {
  method: HttpMethod;
  path: string;
  handler: string;
  middlewares?: RequestHandler[];
}

export function createRouter(controller: any, routes: RouteConfig[]) {
  const router = Router();

  routes.forEach((r) => {
    const middlewares = r.middlewares || [];
    const handler = controller[r.handler];
    router[r.method](r.path, ...middlewares, handler);
  });

  return router;
}
