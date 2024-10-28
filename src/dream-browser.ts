import type { JSXNode, SwapType } from "pipeable-dom/jsx";
import { swap as baseSwap } from "pipeable-dom/browser";

export function defineElement(
  tagName: string,
  Constructor: CustomElementConstructor
) {
  if (import.meta.env.DEV && customElements.get(tagName)) {
    console.log(
      `Element with tag name "${tagName}" already defined. Reloading...`
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
  newContent: JSXNode
): Promise<void> {
  // TODO: Implement enhanced selector syntax
  const target = self.querySelector(selector)!;
  return baseSwap(target, swap, newContent);
}
