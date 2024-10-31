import type { JSXNode } from "pipeable-dom/jsx";

declare module "*.js?url" {
	export const imports: string[];
	const src: string;
	export default src;
}

// declare module "virtual:actions" {
// 	export function getAction(
// 		name: string,
// 	): Promise<
// 		| null
// 		| ((request: Request) => Promise<JSXNode | Response> | JSXNode | Response)
// 	>;
// }
