// Compact optional plugin prompt metadata after the system prompt is built.

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TOOL_SNIPPETS: Record<string, string> = {
	web_search: "Search the web for current external information.",
	source_check: "Gather cited source evidence.",
	fetch_content: "Fetch content from a URL or file.",
	get_search_content: "Read stored search or fetched content.",
	web_enable: "Enable web tools when current external information is needed.",
	get_goal: "Read goal state or omitted requirements.",
	create_goal: "Create a goal only on explicit request.",
	update_goal: "Update goal status or continuation.",
	set_goal_tasks: "Set goal tasks with confirmation.",
	update_goal_task: "Update goal task progress.",
	goal_question: "Ask one goal-drafting question.",
	goal_questionnaire: "Ask goal-drafting questions.",
	propose_goal_draft: "Propose a goal draft for confirmation.",
};

const RULE_REWRITES: Array<readonly [string, string]> = [
	["Never infer persistent goals", "Create goals only on explicit request; preserve the objective; never invent a token budget."],
	["Use tasks only for useful milestones", "Use goal tasks only for useful milestones; restructure them only when requested or requirements change."],
	["start requires pending", "Complete goal tasks only with evidence; skip only with a reason and explicit direction."],
	["Use only during /goal", "Use goal drafting tools only during /goal, /sisyphus, or /goal-tweak; clarify ambiguity first."],
	["Clarify ambiguity before proposing", "Clarify ambiguity before proposing a goal draft."],
	["Set token_budget only when", "Set token_budget only on explicit request; confirm the draft."],
	["Confirmation creates or revises", "Confirm goal drafts atomically."],
] as const;

const CODEMODE_TITLE_GUIDELINE = "Start each codemode script with one comment describing it in the user's language; keep // @options first.";

function compactTools(section: string): string {
	return section
		.split("\n")
		.map((line) => {
			for (const [name, snippet] of Object.entries(TOOL_SNIPPETS)) {
				const prefix = "- " + name + ": ";
				if (line.startsWith(prefix)) return prefix + snippet;
			}
			return line;
		})
		.join("\n");
}

function compactRules(section: string): string {
	return section
		.split("\n")
		.map((line) => {
			for (const [needle, replacement] of RULE_REWRITES) {
				if (line.includes(needle)) return "- " + replacement;
			}
			return line;
		})
		.join("\n");
}

export default function contextSlim(pi: ExtensionAPI): void {
	pi.on("context_with_system", (event) => {
		const system = event.messages.find((message) => message.role === "system");
		if (!system || system.role !== "system" || !system.sections) return;
		if (system.sections.tools) system.sections.tools = compactTools(system.sections.tools);
		if (system.sections.rules) system.sections.rules = compactRules(system.sections.rules);
		if (system.sections.codemode_titles) system.sections.codemode_titles = CODEMODE_TITLE_GUIDELINE;
	});
}
