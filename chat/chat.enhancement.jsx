import { defineElement, swap } from "dream/browser";

import { UserMessage, validateChatInput } from "./chat.shared.jsx";

class ChatForm extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector(".chat-app__form");
    form?.addEventListener("submit", this.handleSubmit);
  }

  handleSubmit(event) {
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
      "find .chat-app__messages > .chat-app__pending-bot-message",
      "beforebegin",
      <UserMessage>{prompt}</UserMessage>
    );
  }
}

defineElement("chat-form", ChatForm);
