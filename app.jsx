import { defineApp } from "dream";

import spinnerSrc from "./icons/spinner.svg?url";
import { getUser, unsetUserId } from "./lib/auth.js";

import appCssHref from "./app.css?url";

export default defineApp((router) =>
  router
    .layout(Layout)
    .route("/login", () => import("./login/login.js"))
    .route("/chat", () => import("./chat/chat.js"))
    .route("*", Home)
);

async function logoutAction(request) {
  "use action";

  unsetUserId();
  return new Response("logged out", {
    status: 303,
    headers: { Location: "/" },
  });
}

function Layout({ children }) {
  const user = getUser();

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href={appCssHref} />
      </head>
      <body>
        {!!user && (
          <form
            action={logoutAction}
            hx-indicator="self"
            hx-disabled-elt="button"
          >
            <button type="submit">
              Logout
              <img
                class="indicator-show"
                src={spinnerSrc}
                alt=""
                width="10"
                height="10"
              />
            </button>
          </form>
        )}
        {children}
      </body>
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
