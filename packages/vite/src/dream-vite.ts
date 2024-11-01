import * as crypto from "node:crypto";
import * as path from "node:path";

import * as babel from "@babel/core";
import { createRequestListener } from "@mjackson/node-fetch-server";
import type { Environment } from "dream";
import * as vite from "vite";

import { useActionBabelPlugin } from "./use-action.js";

export default function dreamVitePlugin(): vite.PluginOption[] {
	let actionsCache: Record<string, Map<string, string>> = {};
	let enhancementsCache: Map<
		string,
		{ entry: string; preloads: string[] } | null
	> = new Map();

	const countActions = () => {
		let count = 0;
		for (const actions of Object.values(actionsCache)) {
			count += actions.size;
		}
		return count;
	};

	const serializeActions = () => {
		let serialized = "{";
		for (const [key, value] of Object.entries(actionsCache)) {
			for (const [name, hash] of value) {
				serialized += `"${hash}": () => import("${key}").then(m => m["${name}"]),`;
			}
		}
		serialized += "}";
		return serialized;
	};

	return [
		{
			name: "dream",
			config(config) {
				return vite.mergeConfig<typeof config, typeof config>(
					{
						builder: {
							sharedConfigBuild: true,
							// sharedPlugins: true,
							async buildApp(builder) {
								let lastActionsCount: number;
								let lastEnhancementsCount: number;
								do {
									lastActionsCount = countActions();
									lastEnhancementsCount = enhancementsCache.size;
									await builder.build(builder.environments.ssr);
								} while (
									lastActionsCount !== countActions() ||
									lastEnhancementsCount !== enhancementsCache.size
								);

								builder.config.environments.client.build.rollupOptions.input =
									Array.from(enhancementsCache.keys());
								if (
									builder.config.environments.client.build.rollupOptions
										.input ||
									enhancementsCache.size
								) {
									const clientBuildOutput = (await builder.build(
										builder.environments.client,
									)) as vite.Rollup.RollupOutput;

									for (const output of clientBuildOutput.output) {
										if (
											(output.type !== "chunk" ||
												!output.isEntry ||
												!output.facadeModuleId) &&
											(output.type !== "asset" ||
												!output.originalFileNames?.[0])
										) {
											continue;
										}

										const entry = path.resolve(
											builder.config.root,
											(output as any).originalFileNames?.[0] ??
												(output as any).facadeModuleId,
										);
										const preloads =
											(output as { imports?: string[] }).imports?.map(
												(p) => builder.config.base + p,
											) ?? [];

										enhancementsCache.set(entry, {
											entry: builder.config.base + output.fileName,
											preloads,
										});
									}
								}

								if (enhancementsCache.size) {
									await builder.build(builder.environments.ssr);
								}

								for (const [name, enhancement] of enhancementsCache) {
									if (!enhancement) {
										throw new Error(`Missing enhancement for ${name}`);
									}
								}
							},
						},
						environments: {
							client: {
								build: {
									assetsInlineLimit: 0,
									outDir: "dist/client",
								},
							},
							ssr: {
								build: {
									assetsInlineLimit: 0,
									outDir: "dist/server",
								},
							},
						},
					},
					config,
				);
			},
		},
		{
			name: "enhancements",
			enforce: "pre",
			async resolveId(id, importer) {
				if (id.endsWith("?url")) {
					const resolvedId = await this.resolve(id.slice(0, -4), importer, {
						skipSelf: true,
					});
					if (!resolvedId) return;
					enhancementsCache.set(
						resolvedId.id,
						enhancementsCache.get(resolvedId.id) ?? null,
					);
					return {
						id: `\0virtual:enhancement:${resolvedId.id}\0`,
						resolvedBy: "enhancement",
					};
				}
			},
			load(id) {
				if (id.startsWith("\0virtual:enhancement:")) {
					const modId = id.slice(21, -1);

					if (this.environment.mode === "dev") {
						return `
							export default "/@fs${vite.normalizePath(modId)}";
							export const imports = [];
						`;
					}

					const enhancement = enhancementsCache.get(modId);

					return `
						export default "${enhancement?.entry}";
						export const imports = ${JSON.stringify(enhancement?.preloads ?? [])};
					`;
				}
			},
		},
		{
			name: "use-action",
			resolveId(id) {
				if (id === "virtual:actions") {
					return "\0virtual:dream-actions";
				}
			},
			load(id) {
				if (id === "\0virtual:dream-actions") {
					if (this.environment.mode === "dev") {
						return `
              export async function getAction(hash) {
                const [id, ...restExp] = hash.split("#");
                const name = restExp.join("#");
                return await import(/* @vite-ignore */ id).then(m => m[name]);
              }
            `;
					}

					return `
            const actions = ${serializeActions()};
            export async function getAction(hash) {
              return await actions[hash]?.();
            }
          `;
				}
			},
			transform(code, id) {
				if (!code.includes("use action")) return;

				const actions = (actionsCache[id] ??= new Map());

				const transformed = babel.transformSync(code, {
					configFile: false,
					plugins: [
						useActionBabelPlugin({
							onAction: (name) => {
								if (this.environment.mode === "dev") {
									const hash = `${id}%23${name}`;
									actions.set(name, hash);
									return `?_action=${hash}`;
								}
								const hash = crypto
									.createHash("md5")
									.update(`${id}|${code}`)
									.digest("hex")
									.slice(-8);
								actions.set(name, hash);
								return `?_action=${hash}`;
							},
						}),
					],
				});

				return typeof transformed?.code === "string"
					? {
							code: transformed.code,
							map: transformed.map,
						}
					: code;
			},
		},
	];
}

export function nodeDevServer(
	routesEntry: string,
	environment?: () => Promise<Environment> | Environment,
): vite.Plugin {
	return {
		name: "node-dev-server",
		configureServer(server) {
			const runner = vite.createServerModuleRunner(server.environments.ssr);

			return () => {
				const listener = createRequestListener(async (request) => {
					const [dream, mod] = await Promise.all([
						runner.import("dream") as Promise<typeof import("dream")>,
						runner.import(routesEntry) as Promise<{
							default?: any;
							routes?: any;
						}>,
						runner.import("urlpattern-polyfill"),
					]);

					const response = await dream.handleRequest(
						request,
						mod.routes || mod.default,
						{
							env: await environment?.(),
							cookieSessionStorage: {
								cookie: {
									secrets: ["development-cookie-secret"],
								},
							},
						},
					);
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
	};
}
