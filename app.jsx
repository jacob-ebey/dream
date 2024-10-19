import { defineApp } from "dream";

export default defineApp((c) => [
  c.layout(
    () => Layout,
    (c) => [
      // Index / Home route
      c.index(() => Home),
      // Login route
      c.route("/login", () => import("./login.js")),
      // LLM chat app
      c.route("/chat", () => import("./chat.js")),
    ]
  ),
]);

function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}

function Home() {
  return (
    <main>
      <h1>Welcome to Dream!</h1>
      <p>
        Dream is a set of tools for building web applications with familiar
        patterns. It's built on native web APIs and is designed with the "use
        the platform" and "progressive enhancement" philosophies in mind.
      </p>
    </main>
  );
}
