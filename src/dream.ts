import { AsyncLocalStorage } from "node:async_hooks";

import type { JSXNode } from "pipeable-dom/jsx";
import { jsx, render } from "pipeable-dom/jsx";
import type {
	ExtractPathnameParams,
	Middleware,
	Renderer,
	RequestHandler,
	Route,
	RouteMatch,
	Router,
} from "std-router";
import {
	defineContext,
	defineRoutes as defineStdRoutes,
	matchRoutes,
	runMatch,
} from "std-router";

export * from "std-router";

export type LayoutComponent = (props: { children: JSXNode }) => JSXNode;

export type ComponentModule = {
	default: (props: any) => JSXNode;
};

type ActionResult<T> = {
	value?: T;
	error?: unknown;
};

type RequestContext = {
	actionResults: WeakMap<any, ActionResult<unknown>>;
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

export const actions =
	(
		getAction: (
			id: string,
		) => Promise<
			| null
			| ((request: Request) => Promise<JSXNode | Response> | JSXNode | Response)
		>,
	): Middleware<never> =>
	async (c, next) => {
		if (c.request.method === "POST") {
			const url = new URL(c.request.url);
			const actionId = url.searchParams.get("_action");
			const action = actionId ? await getAction(actionId) : null;
			if (action) {
				// TODO: Handle progressive enhancement actions here
				try {
					const value = await action(c.request);

					if (
						typeof value === "object" &&
						value != null &&
						value instanceof Response
					) {
						return value;
					}

					getContext().actionResults.set(action, { value });
				} catch (error) {
					if (
						typeof error === "object" &&
						error != null &&
						error instanceof Response
					) {
						return error;
					}

					getContext().actionResults.set(action, { error });
				}
			}
		}
		return next();
	};

export const component =
	<const Mod extends ComponentModule>(
		loadOrModule: (() => Promise<Mod>) | Mod,
	): RequestHandler<Renderer<JSXNode>> =>
	async (c) => {
		if (typeof loadOrModule === "function") {
			loadOrModule = await loadOrModule();
		}
		const Component = loadOrModule.default;
		return c.render(jsx(Component));
	};

const layoutContext = defineContext<LayoutComponent[]>();

export const layout: (Layout: LayoutComponent) => Middleware<never> =
	(Layout) => (c, next) => {
		const layouts = c.get(layoutContext, false) ?? [];
		c.set(layoutContext, [...layouts, Layout]);
		return next();
	};

const renderer: Renderer<JSXNode> = async (c, node, init) => {
	const layouts = c.get(layoutContext, false) ?? [];

	let children = node;
	for (let i = layouts.length - 1; i >= 0; i--) {
		children = jsx(layouts[i], { children });
	}

	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "text/html; charset=utf-8");

	return new Response(render(children), {
		...init,
		headers,
	});
};

export function defineRoutes<
	const RoutesRouter extends Router<any, any, any>,
	const BasePath extends string = "/",
>(
	callback: (
		router: Router<BasePath, typeof renderer, readonly []>,
	) => RoutesRouter,
	{
		basePath,
		middleware,
	}: {
		basePath?: BasePath;
		middleware?: Middleware<any>[];
	} = {},
): RoutesRouter["routes"] {
	return defineStdRoutes<RoutesRouter, typeof renderer, BasePath>(callback, {
		basePath,
		middleware,
		renderer,
	});
}

export interface Session {
	get(key: string): string | null;
	set(key: string, value: string): void;
	unset(key: string): void;
}

export function actionResult<T extends (request: Request) => any>(
	action: T,
): ActionResult<Awaited<ReturnType<T>>> | undefined {
	const { actionResults } = getContext();
	return actionResults.get(action) as
		| ActionResult<Awaited<ReturnType<T>>>
		| undefined;
}

export function getParam(param: string, required: false): string | null;
export function getParam(param: string, required?: boolean): string;
export function getParam(param: string, required = true): string {
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
	routes: ReadonlyArray<Route<any, any>>,
): Promise<Response | null> {
	try {
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

		const response = await requestContext.run(ctx, () =>
			runMatch(match, request),
		);

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
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			error instanceof Error &&
			error.cause instanceof Response
		) {
			return error.cause;
		}
		throw error;
	}
}

export type RoutePattern<Routes extends ReadonlyArray<Route<any, any>>> =
	Routes[number]["path"];

export type RouteParams<Routes extends ReadonlyArray<Route<any, any>>> =
	ExtractPathnameParams<Routes[number]["path"]>;

export function link<const Routes extends ReadonlyArray<Route<any, any>>>(
	pattern: RoutePattern<Routes>,
	{
		action,
		params,
	}: {
		action?: string;
		params?: Record<RouteParams<Routes>, string | number | null | undefined>;
	} = {},
): string {
	let result = pattern;
	for (const [key, value] of Object.entries(params ?? {})) {
		result = result.replace(key, value != null ? String(value) : "");
	}
	const url = new URL(result, "http://localhost");
	if (action) url.searchParams.set("_action", action ?? "");
	return url.pathname + url.search;
}
