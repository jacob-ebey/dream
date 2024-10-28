import type { JSXElementStructure, JSXNode } from "pipeable-dom/jsx";
import { jsx, render } from "pipeable-dom/jsx";
import type { Middleware, Renderer, RequestHandler, Router } from "std-router";
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

export function actionResult<T extends (request: Request) => any>(
  action: T
): Awaited<ReturnType<T>> | undefined {
  // TODO: Implement actions
  return undefined;
}

export function getParam(param: string, required: false): string | null;
export function getParam(param: string, required?: boolean): string;
export function getParam(param: string, required: boolean = true): string {
  // TODO: Implement getting params
  return "";
}
