// Compact optional prompt metadata after the system prompt is built.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { compactRules, compactTools } from "./compact.ts";

export default function contextSlim(pi: ExtensionAPI): void {
	pi.on("context_with_system", (event) => {
		const system = event.messages.find((message) => message.role === "system");
		if (!system || system.role !== "system" || !system.sections) return;
		if (system.sections.tools) system.sections.tools = compactTools(system.sections.tools).text;
		if (system.sections.rules) system.sections.rules = compactRules(system.sections.rules).text;
	});
}
