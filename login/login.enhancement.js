import { defineElement } from "dream/browser";

import { validateLoginInput } from "~/lib/auth.shared.js";

class LoginForm extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector("form");
    form?.addEventListener("submit", this.handleSubmit);
  }

  handleSubmit(event) {
    const form = event.target;
    const passwordInput = form.querySelector("input[name=password]");

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
