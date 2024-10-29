import { actionResult, getParam } from "dream";

import { getUser } from "~/lib/auth.js";

import stylesHref from "./chat.css?url";
import enhancementSrc from "./chat.enhancement.tsx?enhancement";
import { getMessages, validateAndSendChatMessage } from "./chat.server.js";
import { BotMessage, ErrorMessage, UserMessage } from "./chat.shared.js";

async function sendMessageAction(request: Request) {
	"use action";

	const user = getUser();

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
	const chatId = getParam("chatId", false);

	const user = getUser();
	const messages = chatId ? await getMessages(user.id, chatId) : [];

	const sendMessageResult = actionResult(sendMessageAction);

	return (
		<>
			<script async src={enhancementSrc} />
			<link rel="stylesheet" href={stylesHref} />

			<chat-app>
				<div class="chat-app__messages">
					{messages.map((message) => {
						if (message.sender === "user") {
							return <UserMessage>{message.text}</UserMessage>;
						}
						return <BotMessage>{message.text}</BotMessage>;
					})}
					{sendMessageResult?.value}
					{sendMessageResult?.error && (
						<ErrorMessage>Something went wrong</ErrorMessage>
					)}
					<div class="chat-app__pending-bot-message">
						<BotMessage>...</BotMessage>
					</div>
				</div>
				<form
					action={sendMessageAction}
					method="post"
					class="chat-app__form"
					hx-target="previous .chat-app__messages > .chat-app__pending-bot-message"
					hx-swap="beforebegin"
					hx-disabled-elt="input, button"
					hx-indicator="closest chat-app"
				>
					<input type="hidden" name="chatId" value={chatId} />
					<input type="text" name="prompt" />
					<button type="submit">Send</button>
				</form>
			</chat-app>
		</>
	);
}

async function* StreamText({ iterable }: { iterable: AsyncIterable<string> }) {
	for await (const text of iterable) {
		yield <span>{text}</span>;
	}
}
