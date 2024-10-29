import * as crypto from "node:crypto";
import * as stream from "node:stream";
import type * as webStream from "node:stream/web";

import * as babel from "@babel/core";
import type { Route } from "std-router";
import { createServerModuleRunner, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { useActionBabelPlugin } from "./src/use-action.js";

const appEntry = "./example/app.tsx";

declare global {
  var actionsCache: Record<string, Map<string, string>>;
}

global.actionsCache = global.actionsCache ?? {};

function countActions() {
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
    {
      name: "enhancement",
      enforce: "pre",
      resolveId(id) {
        if (id.endsWith("?enhancement")) {
          return "\0virtual:enhancement";
        }
      },
      load(id) {
        if (id === "\0virtual:enhancement") {
          return `export default "/virtual-enhancement.js";`;
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
    {
      name: "dev-server",
      configureServer(server) {
        const runner = createServerModuleRunner(server.environments.ssr);
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              const [dream, mod] = await Promise.all([
                runner.import("./src/dream.ts") as Promise<
                  typeof import("dream")
                >,
                runner.import(appEntry) as Promise<{
                  routes: ReadonlyArray<Route<any, any>>;
                }>,
                runner.import("urlpattern-polyfill"),
              ]);

              const url = new URL(
                req.originalUrl || "/",
                `http://${req.headers.host}`
              );
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (Array.isArray(value)) {
                  for (const header of value) {
                    headers.append(key, header);
                  }
                } else if (typeof value === "string") {
                  headers.set(key, value);
                }
              }

              const hasBody = req.method !== "HEAD" && req.method !== "GET";
              const request = new Request(url, {
                body: hasBody
                  ? (stream.Readable.toWeb(req) as ReadableStream<Uint8Array>)
                  : undefined,
                duplex: hasBody ? "half" : undefined,
                headers,
                method: req.method,
              } as RequestInit & { duplex?: "half" });

              const response = await dream.handleRequest(request, mod.routes);
              if (!response) {
                return next();
              }

              const responseHeaders: Record<string, string | string[]> = {};
              for (const [key, value] of response.headers) {
                if (responseHeaders[key]) {
                  responseHeaders[key] = [
                    ...(Array.isArray(responseHeaders[key])
                      ? responseHeaders[key]
                      : [responseHeaders[key]]),
                    value,
                  ];
                } else {
                  responseHeaders[key] = value;
                }
              }

              res.writeHead(
                response.status,
                response.statusText,
                responseHeaders
              );

              if (response.body) {
                stream.Readable.fromWeb(
                  response.body as webStream.ReadableStream<Uint8Array>
                ).pipe(res, { end: true });
              } else {
                res.end();
              }
            } catch (error) {
              next(error);
            }
          });
        };
      },
    },
  ],
});
