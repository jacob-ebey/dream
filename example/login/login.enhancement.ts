import { defineElement } from "dream/browser";

import { validateLoginInput } from "~/lib/auth.shared.js";

class LoginForm extends HTMLElement {
	connectedCallback() {
		const form = this.querySelector("form") as HTMLFormElement;
		form.addEventListener("submit", this.handleSubmit);

		const passwordInput = form.querySelector(
			"input[name=password]",
		) as HTMLInputElement;
		passwordInput.addEventListener("change", () => {
			passwordInput.setCustomValidity("");
		});
	}

	handleSubmit(event: SubmitEvent) {
		const form = event.target as HTMLFormElement;
		const passwordInput = form.querySelector(
			"input[name=password]",
		) as HTMLInputElement;

		const formData = new FormData(form, event.submitter);
		const username = formData.get("username");
		const password = formData.get("password");

		const validated = validateLoginInput(username, password);

		if (!validated.valid) {
			passwordInput.setCustomValidity(validated.error);
			event.preventDefault();
			return;
		}
	}
}

defineElement("login-form", LoginForm);
