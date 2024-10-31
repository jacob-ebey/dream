import dream, { nodeDevServer } from "@dream/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const appEntry = "./src/app.tsx";

export default defineConfig({
	environments: {
		ssr: {
			build: {
				rollupOptions: {
					input: appEntry,
					// This is only necessary within in this mono-repo
					external: [
						"dream",
						"dream/jsx",
						"dream/jsx-runtime",
						"dream/jsx-dev-runtime",
					],
				},
			},
		},
	},
	plugins: [
		tsconfigPaths(),
		dream(),
		nodeDevServer(appEntry, () =>
			import("./environment.js").then(({ environment }) => environment()),
		),
	],
});
