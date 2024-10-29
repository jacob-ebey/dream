import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/dream-browser.ts",
		"src/dream-jsx.ts",
		"src/dream-vite.ts",
		"src/dream.ts",
	],
	dts: true,
	format: ["esm"],
	platform: "node",
});
