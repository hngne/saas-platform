import { RequestHandler, Router } from "express";

type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

interface RouteConfig<T> {
  method: HttpMethod;
  path: string;
  handler: keyof T;
  middlewares?: RequestHandler[];
}

export function createRouter<T>(controller: T, routes: RouteConfig<T>[]) {
  const router = Router();

  routes.forEach((r) => {
    const middlewares = r.middlewares || [];
    const handler = controller[r.handler] as unknown as RequestHandler;
    router[r.method](r.path, ...middlewares, handler);
  });

  return router;
}
