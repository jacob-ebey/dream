import { defineElement, swap } from "dream/browser";

import { UserMessage, validateChatInput } from "./chat.shared.jsx";

class ChatApp extends HTMLElement {
	connectedCallback() {
		const form = this.querySelector(".chat-app__form") as HTMLFormElement;
		form.addEventListener("submit", this.handleSubmit.bind(this));

		const promptInput = form.querySelector(
			"input[name=prompt]",
		) as HTMLInputElement;
		promptInput.addEventListener("input", () => {
			promptInput.setCustomValidity("");
		});
	}

	handleSubmit(event: SubmitEvent) {
		const form = event.target as HTMLFormElement;
		const promptInput = form.querySelector(
			"input[name=prompt]",
		) as HTMLInputElement;

		const formData = new FormData(form, event.submitter);
		const prompt = formData.get("prompt");

		const validated = validateChatInput(prompt);

		if (!validated.valid) {
			promptInput.setCustomValidity(validated.error);
			promptInput.reportValidity();
			event.preventDefault();
			return;
		}

		swap(
			this,
			"find .chat-app__pending-bot-message",
			"beforebegin",
			<UserMessage>{prompt}</UserMessage>,
		);

		setTimeout(() => {
			form.reset();
			promptInput.select();
		});
	}
}

defineElement("chat-app", ChatApp);
