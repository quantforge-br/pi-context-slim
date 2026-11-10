// Rewrite tables and the pure section transforms they drive.

export const TOOL_SNIPPETS: Record<string, string> = {
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

/**
 * Shortened rule lines, keyed by a sentence the upstream line contains. Each replacement keeps
 * the constraints the model has to satisfy and drops only the explanation around them.
 */
export const RULE_REWRITES: Array<readonly [string, string]> = [
	[
		"Never infer persistent goals",
		"Create goals only on explicit request; the objective preserves every requirement and ordered step; set a token budget only when supplied.",
	],
	[
		"Use tasks only for useful milestones",
		"Use goal tasks only for useful milestones; restructure only when requested or requirements change; the tree is flat, parent-linked, at most 50 tasks, and lightweight_subtasks applies to parents only.",
	],
	[
		"start requires pending",
		"Task transitions: start requires pending; complete requires evidence and finished non-lightweight children; skip requires a reason and explicit direction, never to avoid work; completed tasks are immutable.",
	],
	["Use only during /goal", "Use goal drafting tools only during /goal, /sisyphus, or /goal-tweak."],
	["Clarify ambiguity before proposing", "Clarify ambiguity before proposing a goal draft."],
	["Set token_budget only when", "Set token_budget only on explicit request, and confirm the draft."],
	["Confirmation creates or revises", "Confirming the draft creates or revises the goal."],
] as const;

/** The goal tools whose presence means the goal rule lines should have been declared too. */
const GOAL_TOOL_NAMES = [
	"get_goal",
	"create_goal",
	"update_goal",
	"set_goal_tasks",
	"update_goal_task",
	"goal_question",
	"goal_questionnaire",
	"propose_goal_draft",
] as const;

export interface SectionOutcome {
	/** The section text to send. */
	text: string;
	/** Configured keys that matched and were rewritten. */
	applied: string[];
	/** Configured keys that matched no line, so their rewrite never ran. */
	missing: string[];
}

/** Rewrite the description line of every configured tool that the section declares. */
export function compactTools(section: string): SectionOutcome {
	const applied: string[] = [];
	const lines = section.split("\n").map((line) => {
		for (const [name, snippet] of Object.entries(TOOL_SNIPPETS)) {
			const prefix = "- " + name + ": ";
			if (!line.startsWith(prefix)) continue;
			applied.push(name);
			return prefix + snippet;
		}
		return line;
	});
	const missing = Object.keys(TOOL_SNIPPETS).filter((name) => !applied.includes(name));
	return { text: lines.join("\n"), applied, missing };
}

/** Rewrite every rule line that contains one of the configured upstream sentences. */
export function compactRules(section: string): SectionOutcome {
	const applied: string[] = [];
	const lines = section.split("\n").map((line) => {
		for (const [needle, replacement] of RULE_REWRITES) {
			if (!line.includes(needle)) continue;
			applied.push(needle);
			return "- " + replacement;
		}
		return line;
	});
	const missing = RULE_REWRITES.map(([needle]) => needle).filter((needle) => !applied.includes(needle));
	return { text: lines.join("\n"), applied, missing };
}

/** Whether the tools section declares any goal tool, which means pi-goal-x is active. */
export function hasGoalTools(toolsSection: string): boolean {
	return toolsSection.split("\n").some((line) =>
		GOAL_TOOL_NAMES.some((name) => line.startsWith("- " + name + ": ")),
	);
}
