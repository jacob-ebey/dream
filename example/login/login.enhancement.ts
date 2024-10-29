import { defineElement } from "dream/browser";

import { validateLoginInput } from "~/lib/auth.shared.js";

class LoginForm extends HTMLElement {
	constructor() {
		super();
		this.attachInternals();
	}

	connectedCallback() {
		const form = this.querySelector("form") as HTMLFormElement;
		form.addEventListener("submit", this.handleSubmit);

		const usernameInput = form.querySelector(
			"input[name=username]",
		) as HTMLInputElement;
		usernameInput.addEventListener("input", () => {
			usernameInput.setCustomValidity("");
			passwordInput.setCustomValidity("");
		});
		const passwordInput = form.querySelector(
			"input[name=password]",
		) as HTMLInputElement;
		passwordInput.addEventListener("input", () => {
			usernameInput.setCustomValidity("");
			passwordInput.setCustomValidity("");
		});
	}

	handleSubmit(event: SubmitEvent) {
		const form = event.target as HTMLFormElement;
		const input = form.querySelector(
			"input[name=username]",
		) as HTMLInputElement;

		const formData = new FormData(form, event.submitter);
		const username = formData.get("username");
		const password = formData.get("password");

		const validated = validateLoginInput(username, password);

		if (!validated.valid) {
			input.setCustomValidity(validated.error);
			input.reportValidity();

			event.preventDefault();
			return;
		}
	}
}

defineElement("login-form", LoginForm);
