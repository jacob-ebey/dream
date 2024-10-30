import type { SwapType } from "pipeable-dom/browser";
import { swap as baseSwap } from "pipeable-dom/browser";
import type { JSXNode } from "pipeable-dom/jsx";

export function defineElement(
	tagName: string,
	Constructor: CustomElementConstructor,
) {
	// TODO: Handle HMR
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
	onAppend?: (element: Node) => void,
): Promise<void> {
	let target = querySelectorExt(self, selector)!;
	if (target === window || target === document) {
		target = document.body;
	}

	return baseSwap(target as Element, swap, newContent, onAppend);
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
		if (url.origin != window.location.origin) return;

		let sync = getSync([anchor, document.body], "replace");
		let swap = getSwap([anchor, document.body]);

		fetchAndSwap(event, url, {}, sync, swap);
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
		if (event.defaultPrevented || form == null) {
			return;
		}

		const submitter = event.submitter as HTMLButtonElement | null;
		const action = submitter?.formAction || form.action;
		const url = new URL(action, window.location.href);
		if (url.origin != window.location.origin) {
			return;
		}

		if (!form.checkValidity()) {
			event.preventDefault();
			return;
		}

		const method = (submitter?.formMethod || form.method).toUpperCase();

		let sync = getSync([submitter, form]);
		let swap = getSwap([submitter, form]);

		let body: FormData | null = null;
		if (method == "POST") {
			body = new FormData(form, submitter);
		} else {
			const searchParams = new URLSearchParams();
			for (const [name, value] of new FormData(form)) {
				if (typeof value == "string") {
					searchParams.append(name, value);
				}
			}
			url.search = searchParams.toString();
		}

		fetchAndSwap(
			event,
			url,
			{
				method,
				body,
			},
			sync,
			swap,
		);
	});
}

function fetchAndSwap(
	event: Event,
	input: URL | string,
	init: RequestInit,
	[
		syncAction,
		shouldAbortPreviousRequest,
		shouldStopSurfacingResults,
		syncElement,
	]: ReturnType<typeof getSync>,
	[swapElement, swapSelector, swapType]: ReturnType<typeof getSwap>,
) {
	if (shouldStopSurfacingResults && syncElement._renderController) {
		syncElement._renderController.abort();
		syncElement._renderController = undefined;
	}
	if (!syncElement._renderController) {
		syncElement._renderController = new AbortController();
	}

	let isInitialRequest = !syncElement._syncController;
	if (syncAction == DROP && !isInitialRequest) {
		event.preventDefault();
		return;
	}

	if (shouldAbortPreviousRequest && syncElement._syncController) {
		syncElement._syncController.abort();
		syncElement._syncController = undefined;
	}

	let controller = (syncElement._syncController = new AbortController());
	let signal = syncElement._syncController.signal;
	let renderSignal = syncElement._renderController.signal;

	// fetch(input, init);
	const headers = new Headers(init.headers);
	headers.set("HX-Request", "true");
	let doFetch = () => {
		// TODO: Process indicators

		return fetch(input, {
			...init,
			headers,
			signal: renderSignal,
		})
			.then(async (response) => {
				if (signal.aborted) {
					return;
				}

				let [a, b] = response.body!.tee();
				let reader = a.getReader();
				try {
					await reader.read();
				} finally {
					reader.releaseLock();
				}

				if (typeof document.startViewTransition != "undefined") {
					let resolved = false;
					return document.startViewTransition(
						() =>
							new Promise((resolve) => {
								swap(
									swapElement,
									swapSelector,
									swapType as SwapType,
									b,
									(node) => {
										if (!resolved && isVisualNode(node)) {
											resolve();
										}
									},
								).finally(() => !resolved && resolve());
							}),
					).ready;
				}

				return swap(swapElement, swapSelector, swapType as SwapType, b);
			})
			.finally(() => {
				// TODO: Process indicators

				if (syncElement._syncController === controller) {
					syncElement._syncController = undefined;
				}
				let next = syncElement._syncQueue?.shift();
				if (next) next();
			});
	};

	syncElement._syncQueue = syncElement._syncQueue ?? [];
	switch (syncAction) {
		case QUEUE_FIRST:
			if (!syncElement._syncQueue.length && !isInitialRequest) {
				syncElement._syncQueue = [doFetch];
			}
			break;
		case QUEUE_LAST:
			if (!isInitialRequest) {
				syncElement._syncQueue = [doFetch];
			}
			break;
		case QUEUE_ALL:
			if (!isInitialRequest) {
				syncElement._syncQueue.push(doFetch);
			}
			break;
	}

	if (!syncElement._syncQueue?.length || syncAction == MAKE) {
		doFetch();
	}

	event.preventDefault();
}

let isVisualNode = (node: Node) => {
	// if not link, meta, script, style, or title
	return (
		node.nodeType === Node.TEXT_NODE ||
		(node.nodeType === Node.ELEMENT_NODE &&
			!(node as Element).matches("link, meta, script, style, title"))
	);
};

let getSwap = (
	toCheck: Array<Element | null | undefined>,
): [element: Element, swapSelector: string, swapType: SwapType] => {
	// Look for the first element with "hx-swap" or "hx-target" attributes.
	// Store the values of these attributes and the element they come from.
	let last = toCheck.filter((check) => check != null).slice(-1)[0];
	let element: Element = last;
	let swap: SwapType = "outerHTML";
	let swapSelector = "self";
	for (let check of toCheck) {
		if (check != null) {
			let swapAttribute = check.getAttribute("hx-swap");
			let targetAttribute = check.getAttribute("hx-target");
			if (swapAttribute || targetAttribute) {
				swap = swapAttribute as SwapType;
				element = check;
				swapSelector = targetAttribute || "self";
				break;
			}
		}
	}

	if (element === document.body) {
		swap = "innerHTML";
	}

	return [element, swapSelector, swap];
};

export type Sync =
	| "drop"
	| "abort"
	| "replace"
	| "queue"
	| "queue first"
	| "queue last"
	| "queue all"
	| "none";

let getSync = (
	toCheck: Array<Element | null | undefined>,
	defaultSync: Sync = "drop",
): [
	syncAction: number,
	shouldAbortPreviousRequest: boolean,
	shouldStopSurfacingResults: boolean,
	syncElement: {
		_renderController?: AbortController;
		_syncController?: AbortController;
		_syncQueue?: Array<() => Promise<void>>;
	},
] => {
	let last = toCheck
		.filter((check) => check != null)
		.slice(-1)[0] as Element & {
		_renderController?: AbortController;
		_syncController?: AbortController;
	};

	let sync: Sync = defaultSync;
	let element:
		| ((Node | Window) & {
				_renderController?: AbortController;
				_syncController?: AbortController;
		  })
		| undefined = last;

	for (let check of toCheck) {
		if (check != null) {
			let syncAttribute = check.getAttribute("hx-sync");
			if (syncAttribute) {
				let split = syncAttribute.split(":");
				if (split.length > 1) {
					sync = split.slice(-1)[0] as Sync;
					let selector = split.slice(0, -1).join(":");
					element = querySelectorExt(check, selector) ?? last;
				} else {
					sync = (split[0] as Sync) || "drop";
					element = last;
				}

				break;
			}
		}
	}

	return [...processSync(sync, element._syncController), element] as const;
};

let DROP = 0;
let MAKE = 1;
let QUEUE_FIRST = 2;
let QUEUE_LAST = 3;
let QUEUE_ALL = 4;

function processSync(
	sync: Sync,
	previousAbortController: AbortController | undefined,
): [
	syncAction: number,
	shouldAbortPreviousRequest: boolean,
	shouldStopSurfacingResults: boolean,
] {
	let syncAction = MAKE;
	let shouldAbortPreviousRequest = false;
	let shouldStopSurfacingResults = false;

	let isOngoingRequest = previousAbortController != null;

	let split = sync.split(":");
	let strategy = split.length > 1 ? split[1] : split[0];
	let normalizedStrategy = (strategy || "drop").trim().toLowerCase();

	switch (normalizedStrategy) {
		case "drop":
			syncAction = isOngoingRequest ? DROP : MAKE;
			break;

		case "abort":
			syncAction = MAKE;
			shouldAbortPreviousRequest = isOngoingRequest;
			break;

		case "replace":
			syncAction = MAKE;
			shouldStopSurfacingResults = true;
			break;

		case "queue":
		case "queue last":
			syncAction = QUEUE_LAST;
			break;

		case "queue first":
			syncAction = QUEUE_FIRST;
			break;

		case "queue all":
			syncAction = QUEUE_ALL;
			break;

		case "none":
			syncAction = MAKE;
			break;

		default:
			throw new Error(`Unknown sync strategy: ${normalizedStrategy}`);
	}

	return [syncAction, shouldAbortPreviousRequest, shouldStopSurfacingResults];
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
	if (typeof eltOrSelector != "string") {
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
	let elt = typeof eltOrSelector == "string" ? document.body : eltOrSelector;
	selector = typeof eltOrSelector == "string" ? eltOrSelector : selector!;

	const resolvedElt = resolveTarget(elt);
	const normalizedSelector = normalizeSelector(selector);

	if (selector == "self") {
		return [resolvedElt];
	}
	if (selector.startsWith("closest ")) {
		return [
			(resolvedElt as Element).closest(normalizedSelector.slice(8)),
		].filter((el): el is Element => !!el);
	}
	if (selector.startsWith("find ")) {
		return [
			(resolvedElt as Element).querySelector(normalizedSelector.slice(5)),
		].filter((el): el is Element => !!el);
	}
	if (selector.startsWith("all ")) {
		return Array.from(
			(resolvedElt as Element).querySelectorAll(normalizedSelector.slice(5)),
		).filter((el): el is Element => !!el);
	}
	if (selector == "next") {
		return [(resolvedElt as Element).nextElementSibling].filter(
			(el): el is Element => !!el,
		);
	}
	if (selector.startsWith("next ")) {
		return [
			scanForwardQuery(resolvedElt, normalizedSelector.slice(5), global),
		].filter((el): el is Element => !!el);
	}
	if (selector == "previous") {
		return [(resolvedElt as Element).previousElementSibling].filter(
			(el): el is Element => !!el,
		);
	}
	if (selector.startsWith("previous ")) {
		return [
			scanBackwardsQuery(resolvedElt, normalizedSelector.slice(9), global),
		].filter((el): el is Element => !!el);
	}
	if (selector == "document") {
		return [document];
	}
	if (selector == "window") {
		return [window];
	}
	if (selector == "body") {
		return [document.body];
	}
	if (selector == "root") {
		return [getRootNode(resolvedElt, global)];
	}
	if (selector == "host") {
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
			elt.compareDocumentPosition(start) == Node.DOCUMENT_POSITION_PRECEDING
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
			elt.compareDocumentPosition(start) == Node.DOCUMENT_POSITION_FOLLOWING
		) {
			return elt;
		}
	}
	return null;
}

function resolveTarget(elt: QueryableElement | string): Node {
	if (typeof elt == "string") {
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
