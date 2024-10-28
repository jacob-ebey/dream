import { AsyncLocalStorage } from "node:async_hooks";

import type { JSXElementStructure, JSXNode } from "pipeable-dom/jsx";
import { jsx, render } from "pipeable-dom/jsx";
import type {
  Middleware,
  Renderer,
  RequestHandler,
  RouteMatch,
  Router,
} from "std-router";
import { defineContext, defineRoutes as defineStdRoutes } from "std-router";

export * from "std-router";

export type LayoutComponent = (props: { children: JSXNode }) => JSXNode;

export const component =
  (
    load: () => Promise<{ default: (props: any) => JSXNode }>
  ): RequestHandler<Renderer<JSXElementStructure>> =>
  async (c) => {
    const mod = await load();
    const Component = mod.default;
    return c.render(jsx(Component));
  };

const layoutContext = defineContext<LayoutComponent[]>();

export const layout: (Layout: LayoutComponent) => Middleware<never> =
  (Layout) => (c, next) => {
    const layouts = c.get(layoutContext, false) ?? [];
    c.set(layoutContext, [...layouts, Layout]);
    return next();
  };

const renderer: Renderer<JSXElementStructure> = (c, node, init) => {
  return new Response(render(node), init);
};

export function defineRoutes<
  const RoutesRouter extends Router<any, any, any>,
  const BasePath extends string = "/"
>(
  callback: (
    router: Router<BasePath, typeof renderer, readonly []>
  ) => RoutesRouter,
  {
    basePath,
    middleware,
  }: {
    basePath?: BasePath;
    middleware?: Middleware<any>[];
  } = {}
) {
  return defineStdRoutes(callback, {
    basePath,
    middleware,
    renderer,
  }).routes;
}

type RequestContext = {
  actionResults: WeakMap<any, any>;
  match: RouteMatch;
  request: Request;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

const getContext = () => {
  const ctx = requestContext.getStore();
  if (!ctx) {
    throw new Error("No request context available");
  }
  return ctx;
};

export function actionResult<T extends (request: Request) => any>(
  action: T
): Awaited<ReturnType<T>> | undefined {
  const { actionResults } = getContext();
  return actionResults.get(action);
}

export function getParam(param: string, required: false): string | null;
export function getParam(param: string, required?: boolean): string;
export function getParam(param: string, required: boolean = true): string {
  const {
    match: { match },
  } = getContext();
  const value = match.pathname.groups[param];
  if (required && !value) {
    throw new Error(`Missing required parameter: ${param}`);
  }
  return value as string;
}
