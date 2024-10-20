import botIconSrc from "~/icons/bot-icon.svg?url";
import errorIconSrc from "~/icons/error-icon.svg?url";
import userIconSrc from "~/icons/user-icon.svg?url";

export function validateChatInput(prompt) {
  prompt = prompt?.trim();
  if (typeof prompt !== "string" || !prompt) {
    return {
      valid: false,
      error: "Prompt must be a string",
    };
  }
  return {
    valid: true,
  };
}

export function UserMessage({ children }) {
  return (
    <div class="chat-app__user-message">
      <img src={userIconSrc} alt="" width="24" height="24" />
      <p>{children}</p>
    </div>
  );
}

export function BotMessage({ children }) {
  return (
    <div class="chat-app__bot-message">
      <img src={botIconSrc} alt="" width="24" height="24" />
      <pre>{children}</pre>
    </div>
  );
}

export function ErrorMessage({ children }) {
  return (
    <div class="chat-app__bot-message chat-app__error-message">
      <img src={errorIconSrc} alt="" width="24" height="24" />
      <p>{children}</p>
    </div>
  );
}
