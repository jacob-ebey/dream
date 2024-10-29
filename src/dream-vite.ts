import * as crypto from "node:crypto";

import * as babel from "@babel/core";
import type * as vite from "vite";

import { useActionBabelPlugin } from "./use-action.js";

declare global {
	var actionsCache: Record<string, Map<string, string>>;
}

global.actionsCache = global.actionsCache ?? {};

export default function dreamVitePlugin(): vite.PluginOption[] {
	return [
		{
			name: "enhancement",
			enforce: "pre",
			resolveId(id, importer) {
				if (id.endsWith("?enhancement")) {
					return `\0virtual:enhancement:${id.slice(0, -11)}?importer=${importer || ""}`;
				}
			},
			async load(id) {
				if (id.startsWith("\0virtual:enhancement:")) {
					const [modId, ...restImporter] = id.slice(21).split("?");
					const importer = restImporter.join("?").slice(10);
					if (this.environment.mode === "dev") {
						const resolvedId = await this.resolve(
							modId,
							importer ?? undefined,
							{
								skipSelf: true,
							},
						);
						if (!resolvedId) {
							throw new Error(
								`Could not resolve enhancement ${modId} from ${importer}`,
							);
						}

						return `export default "${resolvedId.id}";`;
					}

					throw new Error("TODO: implement enhancement loading in production");
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

export function countActions() {
	let count = 0;
	for (const actions of Object.values(global.actionsCache)) {
		count += actions.size;
	}
	return count;
}

function serializeActions() {
	let serialized = "{";
	for (const [key, value] of Object.entries(global.actionsCache)) {
		for (const [name, hash] of value) {
			serialized += `"${hash}": () => import("${key}").then(m => m["${name}"]),`;
		}
	}
	serialized += "}";
	return serialized;
}
