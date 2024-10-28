import type { JSXNode } from "dream/jsx-runtime";

import botIconSrc from "~/icons/bot-icon.svg?url";
import errorIconSrc from "~/icons/error-icon.svg?url";
import userIconSrc from "~/icons/user-icon.svg?url";

export function validateChatInput(prompt: FormDataEntryValue | null):
  | {
      valid: false;
      error: string;
      input: { prompt: string | null };
    }
  | {
      valid: true;
      input: { prompt: string };
    } {
  prompt = (typeof prompt === "string" && prompt?.trim()) || null;
  if (typeof prompt !== "string" || !prompt) {
    return {
      valid: false,
      error: "Prompt must be a string",
      input: { prompt: null },
    };
  }
  return {
    valid: true,
    input: { prompt },
  };
}

export function UserMessage({ children }: { children?: JSXNode }) {
  return (
    <div class="chat-app__user-message">
      <img src={userIconSrc} alt="" width="24" height="24" />
      <p>{children}</p>
    </div>
  );
}

export function BotMessage({ children }: { children?: JSXNode }) {
  return (
    <div class="chat-app__bot-message">
      <img src={botIconSrc} alt="" width="24" height="24" />
      <pre>{children}</pre>
    </div>
  );
}

export function ErrorMessage({ children }: { children?: JSXNode }) {
  return (
    <div class="chat-app__bot-message chat-app__error-message">
      <img src={errorIconSrc} alt="" width="24" height="24" />
      <p>{children}</p>
    </div>
  );
}
