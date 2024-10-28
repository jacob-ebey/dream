import { AsyncLocalStorage } from "node:async_hooks";

import type { JSXNode } from "pipeable-dom/jsx";
import { jsx, render } from "pipeable-dom/jsx";
import type {
  Middleware,
  Renderer,
  RequestHandler,
  RouteMatch,
  Route,
  Router,
  ExtractPathnameParams,
} from "std-router";
import {
  defineContext,
  defineRoutes as defineStdRoutes,
  matchRoutes,
  runMatch,
} from "std-router";

export * from "std-router";

export type LayoutComponent = (props: { children: JSXNode }) => JSXNode;

export const component =
  (
    loadOrComponent:
      | ((props: any) => Promise<{ default: (props: any) => JSXNode }>)
      | ((props: any) => JSXNode)
  ): RequestHandler<Renderer<JSXNode>> =>
  async (c) => {
    const mod: { default: (props: any) => JSXNode } | JSXNode = await (
      loadOrComponent as (
        props: any
      ) => { default: (props: any) => JSXNode } | JSXNode
    )({});
    if (typeof mod === "object" && mod !== null && "default" in mod) {
      const Component = mod.default;
      return c.render(jsx(Component));
    }
    return c.render(mod);
  };

const layoutContext = defineContext<LayoutComponent[]>();

export const layout: (Layout: LayoutComponent) => Middleware<never> =
  (Layout) => (c, next) => {
    const layouts = c.get(layoutContext, false) ?? [];
    c.set(layoutContext, [...layouts, Layout]);
    return next();
  };

const renderer: Renderer<JSXNode> = (c, node, init) => {
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
): RoutesRouter["routes"] {
  return defineStdRoutes<RoutesRouter, typeof renderer, BasePath>(callback, {
    basePath,
    middleware,
    renderer,
  }).routes;
}

export interface Session {
  get(key: string): string | null;
  set(key: string, value: string): void;
  unset(key: string): void;
}

type RequestContext = {
  actionResults: WeakMap<any, any>;
  match: RouteMatch;
  request: Request;
  session: Session;
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

export function getSession(): Session {
  const { session } = getContext();
  return session;
}

export async function handleRequest(
  request: Request,
  routes: ReadonlyArray<Route<any, any>>
): Promise<Response | null> {
  const match = matchRoutes(routes, new URL(request.url));
  if (!match) {
    return null;
  }

  const actionResults = new WeakMap();

  let hasModifiedSession = false;
  // TODO: Implement session storage
  const session: Session = {
    get(key) {
      return null;
    },
    set(key, value) {
      hasModifiedSession = true;
    },
    unset(key) {
      hasModifiedSession = true;
    },
  };

  const ctx: RequestContext = {
    actionResults,
    match,
    request,
    session,
  };

  const response = await requestContext.run(ctx, async () => {
    return await runMatch(match, request);
  });

  if (hasModifiedSession) {
    const headers = new Headers(response.headers);
    // TODO: Commit session changes
    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return response;
}

export type RoutePattern<Routes extends ReadonlyArray<Route<any, any>>> =
  Routes[number]["path"];

export type RouteParams<Routes extends ReadonlyArray<Route<any, any>>> =
  ExtractPathnameParams<Routes[number]["path"]>;

export function link<Routes extends ReadonlyArray<Route<any, any>>>(
  pattern: RoutePattern<Routes>,
  params?: Record<RouteParams<Routes>, string | number | null | undefined>
): string {
  // TODO: Implement link generation
  return "";
}
