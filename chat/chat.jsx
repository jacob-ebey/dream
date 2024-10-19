import { actionResult } from "dream";

import { requireUser } from "./lib/auth.js";

import stylesHref from "./chat.css?url";
import Enhancement from "./chat.enhancement.js?element";
import { validateAndSendChatMessage } from "./chat.server.js";
import {
  BotMessage,
  ErrorMessage,
  StreamText,
  UserMessage,
} from "./chat.shared.js";

async function sendMessageAction(request) {
  "use action";
  const user = requireUser();

  const formData = await request.formData();
  const chatId = formData.get("chatId");
  const prompt = formData.get("prompt");

  const validated = await validateAndSendChatMessage(user.id, chatId, prompt);
  if (!validated.valid) {
    return <ErrorMessage>{validated.error}</ErrorMessage>;
  }

  return (
    <BotMessage>
      <StreamText iterable={validated.iterable} />
    </BotMessage>
  );
}

export default async function Chat() {
  const chatId = getParam("chatId");

  const user = requireUser();
  const messages = await getMessages(user.id, chatId);

  return (
    <Enhancement>
      <main class="chat">
        <link rel="stylesheet" href={stylesHref} />
        <div class="chat__messages">
          {messages.map((message) => {
            if (message.sender === "user") {
              return <UserMessage>{message.text}</UserMessage>;
            }
            return <BotMessage>{message.text}</BotMessage>;
          })}
          {actionResult(sendMessageAction)}
          <div class="pending-bot-message">
            <BotMessage>...</BotMessage>
          </div>
        </div>
        <form
          action={sendMessageAction}
          hx-target="previous .chat__messages > .chat__pending-bot-message"
          hx-swap="beforebegin"
          hx-disabled-elt="input, button"
          hx-indicator="closest .chat"
        >
          <input type="hidden" name="chatId" value={chatId} />
          <input type="text" name="prompt" />
          <button type="submit">Send</button>
        </form>
      </main>
    </Enhancement>
  );
}
