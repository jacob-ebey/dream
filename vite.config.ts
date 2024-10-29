import { createRequestListener } from "@mjackson/node-fetch-server";
import { createServerModuleRunner, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const appEntry = "./example/app.tsx";

import dream, { countActions } from "./src/dream-vite.js";

export default defineConfig({
	builder: {
		async buildApp(builder) {
			let lastActionsCount: number;
			do {
				lastActionsCount = countActions();
				await builder.build(builder.environments.ssr);
			} while (lastActionsCount !== countActions());
		},
	},
	environments: {
		ssr: {
			build: {
				outDir: "example-dist/server",
				rollupOptions: {
					input: appEntry,
				},
			},
			resolve: {
				conditions: ["node", "module-sync"],
				externalConditions: ["node", "module-sync"],
			},
		},
	},
	plugins: [
		tsconfigPaths(),
		dream(),
		{
			name: "dev-server",
			configureServer(server) {
				const runner = createServerModuleRunner(server.environments.ssr);

				return () => {
					const listener = createRequestListener(async (request) => {
						const [dream, mod] = await Promise.all([
							runner.import("./src/dream.ts") as Promise<
								typeof import("dream")
							>,
							runner.import(appEntry) as Promise<
								typeof import("./example/app.js")
							>,
							runner.import("urlpattern-polyfill"),
						]);

						const response = await dream.handleRequest(request, mod.routes);
						if (!response) {
							return new Response("Not found", { status: 404 });
						}
						return response;
					});

					server.middlewares.use(async (req, res, next) => {
						let url = req.url;
						try {
							req.url = req.originalUrl;
							await listener(req, res);
						} catch (error) {
							req.url = url;
							next(error);
						}
					});
				};
			},
		},
	],
});
