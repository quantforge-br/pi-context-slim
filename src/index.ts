// Compact optional prompt metadata before each request and report rewrites that stop matching.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { compactRules, compactTools, hasGoalTools, type SectionOutcome } from "./compact.ts";

interface RewriteReport {
	/** Outcome for the first tools section seen in the request. */
	tools: SectionOutcome;
	/** Outcome for the first rules section seen in the request. */
	rules: SectionOutcome;
	/** Whether the request declared any goal tool. */
	goalTools: boolean;
	/** How many system messages carried a section this extension rewrites. */
	messages: number;
}

function describeMissing(needles: string[], limit = 3): string {
	const shown = needles.slice(0, limit).map((needle) => JSON.stringify(needle)).join(", ");
	return needles.length > limit ? shown + ` and ${needles.length - limit} more` : shown;
}

export default function contextSlim(pi: ExtensionAPI): void {
	let lastReport: RewriteReport | undefined;
	let warnedAboutRules = false;

	pi.on("context_with_system", (event, ctx) => {
		let tools: SectionOutcome | undefined;
		let rules: SectionOutcome | undefined;
		let goalTools = false;
		let messages = 0;

		// Pi appends later system messages that patch prompt sections by name, so every message
		// carrying these sections is rewritten, not just the leading one.
		for (const message of event.messages) {
			if (message.role !== "system" || !message.sections) continue;
			const sections = message.sections;
			if (sections.tools) {
				goalTools = goalTools || hasGoalTools(sections.tools);
				const outcome = compactTools(sections.tools);
				sections.tools = outcome.text;
				tools ??= outcome;
				messages += 1;
			}
			if (sections.rules) {
				const outcome = compactRules(sections.rules);
				sections.rules = outcome.text;
				rules ??= outcome;
			}
		}

		if (tools && rules) lastReport = { tools, rules, goalTools, messages };

		// Derived rewrites fail silently: a package that rewords a guideline leaves the long line
		// in place. Say so once per session instead of paying for the same line forever.
		if (!warnedAboutRules && goalTools && rules && rules.missing.length > 0) {
			warnedAboutRules = true;
			if (ctx.hasUI) {
				ctx.ui.notify(
					`pi-context-slim: goal tools are declared but ${rules.missing.length} rule rewrite(s) no longer match upstream text: ${describeMissing(rules.missing)}. Run /context-slim for the full report.`,
					"warning",
				);
			}
		}

		return { messages: event.messages };
	});

	pi.registerCommand("context-slim", {
		description: "Show which prompt rewrites applied on the last request",
		handler: async (_args, ctx) => {
			if (!lastReport) {
				ctx.ui.notify("pi-context-slim: no request yet in this session.", "info");
				return;
			}
			const { tools, rules, goalTools, messages } = lastReport;
			const lines = [
				`pi-context-slim: ${messages} system message(s) rewritten on the last request`,
				`tools: ${tools.applied.length} rewritten, ${tools.missing.length} not declared here`,
				`rules: ${rules.applied.length} rewritten${goalTools ? "" : " (goal tools not declared)"}`,
			];
			if (rules.missing.length > 0) lines.push(`rules not matched: ${describeMissing(rules.missing, 7)}`);
			if (tools.applied.length > 0) lines.push(`tools rewritten: ${tools.applied.join(", ")}`);
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
