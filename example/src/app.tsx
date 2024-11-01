// @ts-expect-error - TODO: add virtual:actions type defs
import { getAction } from "virtual:actions";
import { actions, component, defineRoutes, layout, link } from "dream";
import type { JSXNode } from "dream/jsx";

import globalStylesHref from "~/global.css?url";
import enhancementSrc from "~/app.enhancement.ts?url";
import { Button } from "~/components/ui/button.js";
import spinnerSrc from "~/icons/spinner.svg?url";
import { getUser, requireUser, unsetUserId } from "~/lib/auth.js";

export const routes = defineRoutes((router) =>
	router
		.use(actions(getAction), layout(Layout))
		.mount(
			"/",
			...defineRoutes((router) =>
				router.use(requireUser).route(
					"/chat",
					component(() => import("./chat/chat.js")),
				),
			),
		)
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
				<link rel="stylesheet" href={globalStylesHref} />
				<script async type="module" src={enhancementSrc} />
			</head>
			<body
				hx-indicator="find .progress-bar"
				class="flex flex-col min-h-[100dvh]"
			>
				<div class="progress-bar indicator-show">
					<div class="progress-bar-value" />
				</div>
				<header
					class="w-full bg-background border-b"
					style="view-transition-name: app-header;"
				>
					<div class="container mx-auto">
						<div class="flex items-center justify-between h-16">
							<nav class="flex items-center space-x-4">
								<a
									href="/"
									class="text-foreground hover:text-primary transition-colors"
								>
									Home
								</a>
								<a
									href="/chat"
									class="text-foreground hover:text-primary transition-colors"
								>
									Chat
								</a>
							</nav>
							{!!user && (
								<form
									action={logoutAction}
									method="post"
									hx-indicator="self"
									hx-disabled-elt="button"
									class="m-0"
								>
									<Button type="submit" variant="ghost">
										Logout
									</Button>
								</form>
							)}
						</div>
					</div>
				</header>

				{children}

				<footer
					class="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t"
					style="view-transition-name: app-footer;"
				>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						© 2024 Dream. All rights reserved.
					</p>
					{/* <nav class="sm:ml-auto flex gap-4 sm:gap-6">
						<a class="text-xs hover:underline underline-offset-4" href="#">
							Terms of Service
						</a>
						<a class="text-xs hover:underline underline-offset-4" href="#">
							Privacy
						</a>
					</nav> */}
				</footer>
			</body>
		</html>
	);
}

function Home() {
	return (
		<main class="flex-1">
			<section class="w-full py-12 md:py-24 lg:py-32 xl:py-48">
				<div class="container mx-auto">
					<div class="flex flex-col items-center space-y-4 text-center">
						<div class="space-y-2">
							<h1 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
								Welcome to Dream!
							</h1>
							<p class="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
								Dream is a set of tools for building web applications with
								familiar patterns.
							</p>
						</div>
						<div class="space-x-4">
							<Button class="inline-flex h-9 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300">
								Get Started
								{/* <ArrowRight class="ml-2 h-4 w-4" /> */}
							</Button>
							<Button variant="outline">Learn More</Button>
						</div>
					</div>
				</div>
			</section>
			<section class="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
				<div class="container mx-auto">
					<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
						<div class="flex flex-col items-center space-y-4 text-center">
							{/* <Code class="h-10 w-10 text-gray-900 dark:text-gray-50" /> */}
							<h2 class="text-xl font-bold">Native Web APIs</h2>
							<p class="text-gray-500 dark:text-gray-400">
								Built on native web APIs for maximum compatibility and
								performance.
							</p>
						</div>
						<div class="flex flex-col items-center space-y-4 text-center">
							{/* <Layers class="h-10 w-10 text-gray-900 dark:text-gray-50" /> */}
							<h2 class="text-xl font-bold">Use the Platform</h2>
							<p class="text-gray-500 dark:text-gray-400">
								Designed with the "use the platform" philosophy for simplicity
								and efficiency.
							</p>
						</div>
						<div class="flex flex-col items-center space-y-4 text-center">
							{/* <Zap class="h-10 w-10 text-gray-900 dark:text-gray-50" /> */}
							<h2 class="text-xl font-bold">Progressive Enhancement</h2>
							<p class="text-gray-500 dark:text-gray-400">
								Built with progressive enhancement in mind for better
								accessibility and user experience.
							</p>
						</div>
					</div>
				</div>
			</section>
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
