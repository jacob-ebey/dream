import dream from "@dream/vite";
import { createRequestListener } from "@mjackson/node-fetch-server";
import { createServerModuleRunner, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const appEntry = "./src/app.tsx";

export default defineConfig({
	environments: {
		ssr: {
			build: {
				rollupOptions: {
					input: appEntry,
				},
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
							runner.import("dream") as Promise<typeof import("dream")>,
							runner.import(appEntry) as Promise<typeof import("./src/app.js")>,
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
