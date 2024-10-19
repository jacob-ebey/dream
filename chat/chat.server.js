import { validateChatInput } from "./chat.shared.js";

export function validateAndSendChatMessage(userId, chatId, prompt) {
  const validated = validateChatInput(prompt);
  if (!validated.valid) {
    return validated;
  }
  return {
    valid: true,
    iterable: streamPrompt(prompt),
  };
}

async function* streamPrompt(prompt) {
  for (const char of `You said: ${prompt}`) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
