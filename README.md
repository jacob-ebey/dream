# Dream

Dream is a set of tools for building web applications with familiar patterns. It's built on native web APIs and is designed with the "use the platform" and "progressive enhancement" philosophies in mind.

## The Pieces

### JSX Runtime

A stateless JSX runtime that renders to either a `ReadableStream<string>` for server rendering, and a `ReadableStream<Node>` for use use in the browser.

It supports:

- the `react-jsx` runtime
- the `h()` function from Preact
- sync and async functional components
- sync and async generator components
- there is no event / callback system, therefor
- callbacks such as `onclick` accept strings and render the JS in the attribute

### Browser Runtime

The browser runtime consists of two sides, the declarative API and the programmatic API.

#### Declarative API

Taking after HTMX, attributes are used to build dynamic interfaces.

Supported attributes are:

- hx-target
- hx-swap
- hx-indicator
- hx-disabled-elt

#### Programmatic API

Sometimes the built in declarative API isn't enough to fulfil complex scenarios such as optimistic UI. In these cases we can implement our own declarative APIs with custom elements and utilize the internals of the declarative API.

Supported exports are:

- `swap` - Render JSX into the DOM
- `defineElement` - A small wrapper around `customElements.define` to help with HMR
- `querySelectorExt` - An extended query selector
- `querySelectorAllExt` - An extended query selector all
