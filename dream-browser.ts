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
