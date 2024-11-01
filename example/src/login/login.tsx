import { actionResult, link } from "dream";

import type { routes } from "~/app.js";
import { Button } from "~/components/ui/button.js";
import { Input } from "~/components/ui/input.js";
import spinnerSrc from "~/icons/spinner.svg?url";
import { setUserId, validateUser } from "~/lib/auth.js";

import enhancementSrc from "./login.enhancement.js?url";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card.js";
import { Label } from "~/components/ui/label.js";

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

			<login-form class="flex-1 flex flex-col justify-center">
				<form
					action={loginAction}
					method="post"
					hx-target="closest login-form"
					hx-indicator="self"
					hx-disabled-elt="button"
					class="flex w-full items-center justify-center px-4 my-4"
					style="view-transition-name: login-form;"
				>
					<Card class="mx-auto max-w-sm">
						<CardHeader style="view-transition-name: login-header;">
							<CardTitle class="text-2xl">Login</CardTitle>
							<CardDescription>
								Enter your info below to login to your account
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="grid gap-4">
								<div
									class="grid gap-2"
									style="view-transition-name: login-username;"
								>
									<Label for="email">Username</Label>
									<Input
										required
										id="username"
										name="username"
										type="text"
										value={username}
										autocomplete="username"
										autofocus={hasError && !username}
									/>
								</div>
								<div
									class="grid gap-2"
									style="view-transition-name: login-password;"
								>
									<div class="flex items-center">
										<Label for="password">Password</Label>
										{/* <a href="#" class="ml-auto inline-block text-sm underline">
											Forgot your password?
										</a> */}
									</div>
									<Input
										required
										id="password"
										name="password"
										type="password"
										autocomplete="current-password"
										autofocus={!!username}
									/>
								</div>
								{!!error && <p class="text-destructive">{error}</p>}
								{loginResult?.error && (
									<p class="text-destructive">Something went wrong</p>
								)}
								<Button
									type="submit"
									class="w-full"
									style="view-transition-name: login-button;"
								>
									Login
								</Button>
							</div>
							{/* <div class="mt-4 text-center text-sm">
								Don&apos;t have an account?{" "}
								<a href="#" class="underline">
									Sign up
								</a>
							</div> */}
						</CardContent>
					</Card>
				</form>
				{/* <form
					action={loginAction}
					method="post"
					hx-target="closest login-form"
					hx-indicator="self"
					hx-disabled-elt="button"
				>
					<p>
						<label for="username">
							Username:
							<Input
								required
								id="username"
								name="username"
								type="text"
								value={username}
								autocomplete="username"
								autofocus={hasError && !username}
							/>
						</label>
					</p>
					<p>
						<label for="password">
							Password:
							<Input
								required
								id="password"
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
						<Button type="submit">
							Login
							<img
								class="indicator-show"
								src={spinnerSrc}
								alt=""
								width="10"
								height="10"
							/>
						</Button>
					</p>
				</form> */}
			</login-form>
		</>
	);
}
