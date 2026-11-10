// Compact optional prompt metadata after the system prompt is built.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { compactRules, compactTools } from "./compact.ts";

export default function contextSlim(pi: ExtensionAPI): void {
	pi.on("context_with_system", (event) => {
		// Pi appends later system messages that patch prompt sections by name, so every message
		// carrying these sections is rewritten, not just the leading one.
		for (const message of event.messages) {
			if (message.role !== "system" || !message.sections) continue;
			if (message.sections.tools) message.sections.tools = compactTools(message.sections.tools).text;
			if (message.sections.rules) message.sections.rules = compactRules(message.sections.rules).text;
		}

		return { messages: event.messages };
	});
}
