import { swap } from "dream/browser";

import { UserMessage, validateChatInput } from "./chat.shared.jsx";

export default class extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector("form");
    form?.addEventListener("submit", this.handleSubmit);
  }

  handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const promptInput = form.querySelector("input[name=prompt]");
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
      "find .messages > .pending-bot-message",
      "beforebegin",
      <UserMessage>{prompt}</UserMessage>
    );
  }
}
