import { actionResult, link } from "dream";

import type { routes } from "~/app.js";
import spinnerSrc from "~/icons/spinner.svg?url";
import { setUserId, validateUser } from "~/lib/auth.js";

import enhancementSrc from "./login.enhancement.js?enhancement";

async function loginAction(request: Request) {
  "use action";

  const formData = await request.formData();
  const validated = await validateUser(
    formData.get("username"),
    formData.get("password")
  );

  if (validated.valid) {
    setUserId(validated.user.id);

    throw new Response("logged in", {
      status: 303,
      headers: { Location: link<typeof routes>("/chat") },
    });
  }

  return <Login error={validated.error} username={validated.input.username} />;
}

export default function Login({
  error,
  username,
}: {
  error?: string;
  username?: string;
}) {
  return (
    actionResult(loginAction) ?? (
      <>
        <script async src={enhancementSrc} />

        <login-form>
          <form
            action={loginAction}
            hx-target="self"
            hx-indicator="self"
            hx-disabled-elt="input, button"
          >
            <label>
              Username:
              <input name="username" type="text" value={username} />
            </label>
            <label>
              Password:
              <input name="password" type="password" />
            </label>
            {!!error && <p>{error}</p>}
            <button type="submit">
              Login
              <img
                class="indicator-show"
                src={spinnerSrc}
                alt=""
                width="10"
                height="10"
              />
            </button>
          </form>
        </login-form>
      </>
    )
  );
}
