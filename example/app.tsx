// @ts-expect-error - TODO: add virtual:actions type defs
import { getAction } from "virtual:actions";
import { actions, component, defineRoutes, layout, link } from "dream";
import type { JSXNode } from "dream/jsx";

// @ts-expect-error - TODO: add ?enhancement type defs
import enhancementSrc from "./app.enhancement.ts?enhancement";
import spinnerSrc from "./icons/spinner.svg?url";
import { getUser, requireUser, unsetUserId } from "./lib/auth.js";

import appCssHref from "./app.css?url";

export const routes = defineRoutes((router) =>
	router
		.mount(
			"/",
			...defineRoutes((router) =>
				router.use(requireUser).route(
					"/chat",
					component(() => import("./chat/chat.js")),
				),
			),
		)
		.use(actions(getAction), layout(Layout))
		.route(
			"/login",
			component(() => import("./login/login.js")),
		)
		.route("/", component({ default: Home }))
		.route("*", component({ default: NotFound })),
);

async function logoutAction(request: Request) {
	"use action";

	unsetUserId();
	return new Response("logged out", {
		status: 303,
		headers: { Location: link<typeof routes>("/") },
	});
}

function Layout({ children }: { children: JSXNode }) {
	const user = getUser(false);

	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="stylesheet" href={appCssHref} />
				<script async type="module" src={enhancementSrc} />
			</head>
			<body>
				<nav>
					<ul>
						<li>
							<a href={link<typeof routes>("/")}>Home</a>
						</li>
						<li>
							<a href={link<typeof routes>("/login")}>Login</a>
						</li>
						<li>
							<a href={link<typeof routes>("/chat")}>Chat</a>
						</li>
					</ul>
				</nav>
				{!!user && (
					<form
						action={logoutAction}
						method="post"
						hx-indicator="self"
						hx-disabled-elt="button"
					>
						<button type="submit">
							Logout
							<img
								class="indicator-show"
								src={spinnerSrc}
								alt=""
								width="10"
								height="10"
							/>
						</button>
					</form>
				)}
				{children}
			</body>
		</html>
	);
}

function Home() {
	return (
		<main>
			<h1>Welcome to Dream!</h1>
			<p>
				Dream is a set of tools for building web applications with familiar
				patterns. It's built on native web APIs and is designed with the "use
				the platform" and "progressive enhancement" philosophies in mind.
			</p>
		</main>
	);
}

function NotFound() {
	return (
		<main>
			<h1>Not Found</h1>
			<p>The page you are looking for does not exist.</p>
		</main>
	);
}
