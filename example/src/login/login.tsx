import { actionResult, link } from "dream";

import type { routes } from "~/app.js";
import spinnerSrc from "~/icons/spinner.svg?url";
import { setUserId, validateUser } from "~/lib/auth.js";

import enhancementSrc from "./login.enhancement.js?url";

async function loginAction(request: Request) {
	"use action";

	const formData = await request.formData();
	const validated = await validateUser(
		formData.get("username"),
		formData.get("password"),
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
	const loginResult = actionResult(loginAction);
	const hasError = !!error || !!loginResult?.error;

	return !error && loginResult?.value ? (
		loginResult.value
	) : (
		<>
			<script async type="module" src={enhancementSrc} />

			<login-form>
				<form
					action={loginAction}
					method="post"
					hx-target="closest login-form"
					hx-indicator="self"
					hx-disabled-elt="button"
				>
					<p>
						<label>
							Username:
							<input
								required
								name="username"
								type="text"
								value={username}
								autocomplete="username"
								autofocus={hasError && !username}
							/>
						</label>
					</p>
					<p>
						<label>
							Password:
							<input
								required
								name="password"
								type="password"
								autocomplete="current-password"
								autofocus={!!username}
							/>
						</label>
					</p>
					{!!error && <p>{error}</p>}
					{loginResult?.error && <p>Something went wrong</p>}
					<p style="view-transition-name: login-button;">
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
					</p>
				</form>
			</login-form>
		</>
	);
}
