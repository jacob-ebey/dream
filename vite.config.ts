import * as stream from "node:stream";
import type * as webStream from "node:stream/web";

import type { Route } from "std-router";
import { createServerModuleRunner, defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const appEntry = "./example/app.tsx";

export default defineConfig({
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.ssr);
    },
  },
  environments: {
    ssr: {
      build: {
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
      name: "dev-server",
      configureServer(server) {
        const runner = createServerModuleRunner(server.environments.ssr);
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              const [dream, mod, urlpattern] = await Promise.all([
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
