import * as fsp from "node:fs/promises";
import { createServer } from "node:http";
import * as path from "node:path";

import { createRequestListener } from "@mjackson/node-fetch-server";
import { defineRoutes, handleRequest } from "dream";
import * as mime from "mime-types";
import "urlpattern-polyfill";

import * as app from "./dist/server/app.js";

const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
	throw new Error("Missing COOKIE_SECRET environment variable");
}

const publicDir = path.resolve("dist/client");

const routes = defineRoutes((router) =>
	router
		.use(async (c, next) => {
			const url = new URL(c.request.url);
			const ext = path.extname(url.pathname);
			const mimeType = mime.lookup(ext);
			if (ext.length > 1 && mimeType) {
				const filepath = path.resolve(publicDir, url.pathname.slice(1));
				const exists = await fsp
					.stat(filepath)
					.then((s) => s.isFile())
					.catch(() => false);
				if (exists) {
					const content = await fsp.readFile(filepath);
					return new Response(
						new ReadableStream({
							start(controller) {
								controller.enqueue(content);
								controller.close();
							},
						}).pipeThrough(new CompressionStream("gzip")),
						{
							headers: {
								"Content-Type": mimeType,
								"Cache-Control": "public, max-age=300",
								"Content-Encoding": "gzip",
							},
						},
					);
				}
			}

			return next();
		})
		.mount("/", ...app.routes),
);

const server = createServer(
	createRequestListener(async (request) => {
		const response = await handleRequest(request, routes, {
			cookieSessionStorage: {
				cookie: {
					secrets: [COOKIE_SECRET],
				},
			},
		});
		if (response) {
			return response;
		}

		return new Response("Not Found", { status: 404 });
	}),
);

server.listen(3000, () => {
	console.log("Server running at http://localhost:3000/");
});
