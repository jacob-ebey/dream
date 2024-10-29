import { defineElement, swap } from "dream/browser";

import { UserMessage, validateChatInput } from "./chat.shared.jsx";

class ChatForm extends HTMLElement {
	connectedCallback() {
		const form = this.querySelector(".chat-app__form") as HTMLFormElement;
		form.addEventListener("submit", this.handleSubmit);

		const promptInput = form.querySelector(
			"input[name=prompt]",
		) as HTMLInputElement;
		promptInput.addEventListener("change", () => {
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
			event.preventDefault();
			return;
		}

		swap(
			this,
			"find .chat-app__messages > .chat-app__pending-bot-message",
			"beforebegin",
			<UserMessage>{prompt}</UserMessage>,
		);
	}
}

defineElement("chat-form", ChatForm);
