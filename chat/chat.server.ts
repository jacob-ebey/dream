import { validateChatInput } from "./chat.shared.js";

export function getMessages(
  userId: string,
  chatId: string
): { sender: string; text: string }[] {
  return [];
}

export function validateAndSendChatMessage(
  userId: string,
  chatId: FormDataEntryValue | null,
  prompt: FormDataEntryValue | null
):
  | {
      valid: false;
      error: string;
    }
  | {
      valid: true;
      iterable: AsyncIterable<string>;
    } {
  const validated = validateChatInput(prompt);
  if (!validated.valid) {
    return validated;
  }

  // TODO: Store the message in the database

  // TODO: Implement calling LLM and storing the result in the db on the next event loop
  // so we always render things in the correct order
  return {
    valid: true,
    iterable: streamPrompt(validated.input.prompt),
  };
}

async function* streamPrompt(prompt: string) {
  for (const char of `You said: ${prompt}`) {
    yield char;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
