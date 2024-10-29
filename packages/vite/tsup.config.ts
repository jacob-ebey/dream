import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/dream-vite.ts"],
	dts: true,
	format: ["esm"],
	platform: "node",
});
