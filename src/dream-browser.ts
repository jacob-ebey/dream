import type { SwapType } from "pipeable-dom/browser";
import { swap as baseSwap } from "pipeable-dom/browser";
import type { JSXNode } from "pipeable-dom/jsx";

export function defineElement(
	tagName: string,
	Constructor: CustomElementConstructor,
) {
	if (import.meta.env.DEV && customElements.get(tagName)) {
		console.log(
			`Element with tag name "${tagName}" already defined. Reloading...`,
		);
		window.location.reload();
		return;
	}
	customElements.define(tagName, Constructor);
}

export function swap(
	self: Element,
	selector: string,
	swap: SwapType,
	newContent:
		| JSXNode
		| Response
		| ReadableStream<string>
		| ReadableStream<Uint8Array>,
): Promise<void> {
	let target = querySelectorExt(self, selector)!;
	if (target === window || target === document) {
		target = document.body;
	}
	return baseSwap(target as Element, swap, newContent);
}

export function installBrowserRuntime() {
	addEventListener("click", (event) => {
		const anchor =
			event.target != null
				? event.target instanceof HTMLAnchorElement
					? event.target
					: event.target instanceof Element
						? event.target.closest("a")
						: null
				: null;
		if (anchor == null) return;

		const url = new URL(anchor.href, window.location.href);
		if (url.origin !== window.location.origin) return;

		const swapTarget = anchor.getAttribute("hx-target") || "body";
		const swapMethod = anchor.getAttribute("hx-swap") || "innerHTML";
		// TODO: Implement hx-sync

		event.preventDefault();

		fetch(url, {
			headers: { "HX-Request": "true" },
		}).then((response) => {
			history.pushState(null, "", response.url);
			return swap(anchor, swapTarget, swapMethod as SwapType, response);
		});
	});

	addEventListener("submit", (event) => {
		const form =
			event.target != null
				? event.target instanceof HTMLFormElement
					? event.target
					: event.target instanceof Element
						? event.target.closest("form")
						: null
				: null;
		if (
			event.defaultPrevented ||
			form == null ||
			!(form ? form?.checkValidity() : true)
		) {
			console.log("form or default prevented");
			return;
		}

		const url = new URL(form.action, window.location.href);
		if (url.origin !== window.location.origin) {
			console.log("origin mismatch");
			return;
		}

		const method = form.method.toUpperCase();

		const swapTarget = form.getAttribute("hx-target") || "body";
		const swapMethod = form.getAttribute("hx-swap") || "innerHTML";

		let body: FormData | null = null;
		if (method === "POST") {
			body = new FormData(form, event.submitter);
		} else {
			const searchParams = new URLSearchParams();
			for (const [name, value] of new FormData(form)) {
				if (typeof value === "string") {
					searchParams.append(name, value);
				}
			}
			url.search = searchParams.toString();
		}

		event.preventDefault();

		fetch(url, {
			method,
			headers: { "HX-Request": "true" },
			body,
		}).then((response) => {
			history.pushState(null, "", response.url);
			return swap(form, swapTarget, swapMethod as SwapType, response);
		});
	});
}

type QueryableElement = Node | Element | Document;

export function querySelectorExt(
	selector: string,
	never: never,
	global?: boolean,
): Node | Window | undefined;
export function querySelectorExt(
	elt: QueryableElement,
	selector: string,
	global?: boolean,
): Node | Window | undefined;
export function querySelectorExt(
	eltOrSelector: QueryableElement | string,
	selector?: string,
): Node | Window | undefined {
	if (typeof eltOrSelector !== "string") {
		return querySelectorAllExt(eltOrSelector, selector!)[0];
	}
	return querySelectorAllExt(document.body, eltOrSelector)[0];
}

export function querySelectorAllExt(selector: string): (Node | Window)[];
export function querySelectorAllExt(
	elt: QueryableElement,
	selector: string,
	global?: boolean,
): (Node | Window)[];
export function querySelectorAllExt(
	elt: QueryableElement,
	selector: string,
	global?: boolean,
): (Node | Window)[];
export function querySelectorAllExt(
	eltOrSelector: QueryableElement | string,
	selector?: string,
	global = false,
): (Node | Window)[] {
	let elt = typeof eltOrSelector === "string" ? document.body : eltOrSelector;
	selector = typeof eltOrSelector === "string" ? eltOrSelector : selector!;

	const resolvedElt = resolveTarget(elt);
	const normalizedSelector = normalizeSelector(selector);

	if (selector == "self") {
		return [resolvedElt];
	}
	if (selector.startsWith("closest ")) {
		return [
			(resolvedElt as Element).closest(normalizedSelector.slice(8)),
		].filter((el): el is Element => el !== null);
	}
	if (selector.startsWith("find ")) {
		return [
			(resolvedElt as Element).querySelector(normalizedSelector.slice(5)),
		].filter((el): el is Element => el !== null);
	}
	if (selector.startsWith("all ")) {
		return Array.from(
			(resolvedElt as Element).querySelectorAll(normalizedSelector.slice(5)),
		).filter((el): el is Element => el !== null);
	}
	if (selector === "next") {
		return [(resolvedElt as Element).nextElementSibling].filter(
			(el): el is Element => el !== null,
		);
	}
	if (selector.startsWith("next ")) {
		return [
			scanForwardQuery(resolvedElt, normalizedSelector.slice(5), global),
		].filter((el): el is Element => el !== null);
	}
	if (selector === "previous") {
		return [(resolvedElt as Element).previousElementSibling].filter(
			(el): el is Element => el !== null,
		);
	}
	if (selector.startsWith("previous ")) {
		return [
			scanBackwardsQuery(resolvedElt, normalizedSelector.slice(9), global),
		].filter((el): el is Element => el !== null);
	}
	if (selector === "document") {
		return [document];
	}
	if (selector === "window") {
		return [window];
	}
	if (selector === "body") {
		return [document.body];
	}
	if (selector === "root") {
		return [getRootNode(resolvedElt, global)];
	}
	if (selector === "host") {
		const rootNode = resolvedElt.getRootNode();
		return rootNode instanceof ShadowRoot ? [rootNode.host] : [];
	}
	if (selector.startsWith("global ")) {
		return querySelectorAllExt(resolvedElt, selector.slice(7), true);
	}
	return Array.from(
		getRootNode(resolvedElt, global).querySelectorAll(normalizedSelector),
	);
}

function normalizeSelector(selector: string): string {
	const trimmedSelector = selector.trim();
	if (trimmedSelector.startsWith("<") && trimmedSelector.endsWith("/>")) {
		return trimmedSelector.slice(1, -2);
	}
	return trimmedSelector;
}

function scanForwardQuery(
	start: Node,
	match: string,
	global: boolean,
): Element | null {
	const root = getRootNode(start, global);
	const results = root.querySelectorAll(match);
	for (const elt of results) {
		if (
			elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_PRECEDING
		) {
			return elt;
		}
	}
	return null;
}

function scanBackwardsQuery(
	start: Node,
	match: string,
	global: boolean,
): Element | null {
	const root = getRootNode(start, global);
	const results = Array.from(root.querySelectorAll(match));
	for (let i = results.length - 1; i >= 0; i--) {
		const elt = results[i];
		if (
			elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_FOLLOWING
		) {
			return elt;
		}
	}
	return null;
}

function resolveTarget(elt: QueryableElement | string): Node {
	if (typeof elt === "string") {
		const resolved = document.querySelector(elt);
		if (!resolved) {
			throw new Error(`Could not resolve selector: ${elt}`);
		}
		return resolved;
	}
	return elt;
}

function getRootNode(node: Node, global: boolean): ParentNode {
	if (global) {
		return node.ownerDocument || document;
	}
	const root = node.getRootNode();
	return root as Document | ShadowRoot;
}
