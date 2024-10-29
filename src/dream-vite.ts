import * as crypto from "node:crypto";

import * as babel from "@babel/core";
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
							sharedPlugins: true,
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
									clientBuildOutput.output.find((output) => {
										if (
											output.type !== "chunk" ||
											!output.isEntry ||
											!output.facadeModuleId
										)
											return false;
										if (enhancementsCache.has(output.facadeModuleId)) {
											enhancementsCache.set(output.facadeModuleId, {
												entry: output.fileName,
												preloads: output.imports,
											});
										}
									});
								}

								if (enhancementsCache.size) {
									await builder.build(builder.environments.ssr);
								}
							},
						},
					},
					config,
				);
			},
		},
		{
			name: "enhancement",
			enforce: "pre",
			async resolveId(id, importer) {
				if (id.endsWith("?enhancement")) {
					const resolvedId = await this.resolve(id.slice(0, -12), importer, {
						skipSelf: true,
					});
					if (!resolvedId) return;
					enhancementsCache.set(resolvedId.id, null);
					return `\0virtual:enhancement:${resolvedId.id}`;
				}
			},
			load(id) {
				if (id.startsWith("\0virtual:enhancement:")) {
					const modId = id.slice(21);
					if (this.environment.mode === "dev") {
						return `export default "${modId}";`;
					}

					return `export default "${enhancementsCache.get(modId)?.entry}"`;
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
