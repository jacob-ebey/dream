import { actionResult, getParam } from "dream";

import spinnerSrc from "~/icons/spinner.svg?url";
import { getUser } from "~/lib/auth.js";

import stylesHref from "./chat.css?url";
import enhancementSrc from "./chat.enhancement.tsx?url";
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
			<link rel="stylesheet" href={stylesHref} />
			<script async type="module" src={enhancementSrc} />

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
					hx-disabled-elt="chat-app button"
					hx-indicator="closest chat-app"
				>
					<input type="hidden" name="chatId" value={chatId} />
					<input type="text" name="prompt" />
					<button type="submit">
						Send
						<img
							class="indicator-show"
							src={spinnerSrc}
							alt=""
							width="10"
							height="10"
						/>
					</button>
				</form>
			</chat-app>
		</>
	);
}

async function* StreamText({ iterable }: { iterable: AsyncIterable<string> }) {
	yield* iterable;
	// for await (const text of iterable) {
	// 	yield <span>{text}</span>;
	// }
}
