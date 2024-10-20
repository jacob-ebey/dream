import { validateChatInput } from "./chat.shared.js";

export function validateAndSendChatMessage(userId, chatId, prompt) {
  const validated = validateChatInput(prompt);
  if (!validated.valid) {
    return validated;
  }

  // TODO: Store the message in the database

  // TODO: Implement calling LLM and storing the result in the db on the next event loop
  // so we always render things in the correct order
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
