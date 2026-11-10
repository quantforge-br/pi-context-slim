import assert from "node:assert/strict";
import test from "node:test";

import { RULE_REWRITES, TOOL_SNIPPETS, compactRules, compactTools, hasGoalTools } from "../src/compact.ts";

/** Rule lines captured verbatim from a live prompt with pi-goal-x loaded. */
const UPSTREAM_RULES = [
	"- Never infer persistent goals, Sisyphus mode, or token budgets from an ordinary task. The objective must faithfully preserve all user requirements and ordered steps.",
	"- Use tasks only for useful milestones. Restructure an existing tree only when the user asks or requirements structurally change. Input is a flat parent-linked tree, at most 50 tasks, within configured depth. lightweight_subtasks is valid only on parents.",
	"- start requires pending and sets current task. complete requires evidence for contracted tasks and completed/skipped non-lightweight children. skipped requires a reason and explicit user direction or a hard contradiction; never skip to avoid work. pending reopens skipped tasks only; completed tasks are immutable. Completing/skipping the current task clears focus.",
];

/** Tool description lines captured verbatim from the same prompt. */
const UPSTREAM_TOOLS = [
	"- web_search: Use for web research questions. Prefer {queries:[...]} with 2-4 varied angles over a single query for broader coverage. Omit provider unless explicitly overriding the configured default.",
	"- create_goal: Create a goal only when explicitly requested.",
	"- update_goal_task: Start, complete, skip, or reopen tasks; batch related progress.",
];

function wrap(name: string, body: string): string {
	return `<${name}>\n${body}\n</${name}>`;
}

test("every captured upstream rule line is rewritten", () => {
	const section = wrap("rules", UPSTREAM_RULES.join("\n"));
	const outcome = compactRules(section);

	assert.deepEqual(outcome.applied, [
		"Never infer persistent goals",
		"Use tasks only for useful milestones",
		"start requires pending",
	]);
	for (const line of UPSTREAM_RULES) assert.ok(!outcome.text.includes(line), "long line survived: " + line.slice(0, 40));
	assert.ok(outcome.text.startsWith("<rules>\n"), "the section wrapper is preserved");
	assert.ok(outcome.text.endsWith("\n</rules>"));
});

test("the shortened rule lines keep the constraints the model has to satisfy", () => {
	const outcome = compactRules(wrap("rules", UPSTREAM_RULES.join("\n")));

	assert.match(outcome.text, /at most 50 tasks/);
	assert.match(outcome.text, /lightweight_subtasks applies to parents only/);
	assert.match(outcome.text, /completed tasks are immutable/);
	assert.match(outcome.text, /never to avoid work/);
	assert.match(outcome.text, /preserves every requirement and ordered step/);
});

test("a rewritten rule line keeps the bullet format", () => {
	const outcome = compactRules(wrap("rules", UPSTREAM_RULES.join("\n")));
	const rewritten = outcome.text.split("\n").filter((line) => line.startsWith("- "));

	assert.equal(rewritten.length, UPSTREAM_RULES.length);
});

test("lines that match no configured needle are left untouched", () => {
	const untouched = ["- Be concise in your responses", "- Show file paths clearly when working with files"];
	const outcome = compactRules(wrap("rules", [...untouched, ...UPSTREAM_RULES].join("\n")));

	for (const line of untouched) assert.ok(outcome.text.includes(line), "line was modified: " + line);
});

test("every captured tool line is rewritten to its snippet", () => {
	const section = wrap("tools", UPSTREAM_TOOLS.join("\n"));
	const outcome = compactTools(section);

	assert.deepEqual(outcome.applied, ["web_search", "create_goal", "update_goal_task"]);
	for (const name of outcome.applied) assert.ok(outcome.text.includes("- " + name + ": " + TOOL_SNIPPETS[name]));
	assert.ok(!outcome.text.includes("Prefer {queries:[...]}"), "the long web_search guidance survived");
});

test("tools a prompt does not declare are reported as missing, not as a failure", () => {
	const outcome = compactTools(wrap("tools", UPSTREAM_TOOLS.join("\n")));

	assert.deepEqual(
		outcome.missing,
		Object.keys(TOOL_SNIPPETS).filter((name) => !outcome.applied.includes(name)),
	);
	assert.ok(outcome.missing.includes("fetch_content"));
});

test("a section with no configured line comes back unchanged", () => {
	const section = wrap("rules", "- Ask 1-4 questions when ambiguity blocks progress");

	assert.equal(compactRules(section).text, section);
	assert.equal(compactTools(wrap("tools", "- read: Read a file")).text, wrap("tools", "- read: Read a file"));
});

test("goal tools are detected from the tools section", () => {
	assert.equal(hasGoalTools(wrap("tools", UPSTREAM_TOOLS.join("\n"))), true);
	assert.equal(hasGoalTools(wrap("tools", "- read: Read a file\n- bash: Run a command")), false);
});

test("compacting an already compacted section changes nothing", () => {
	const once = compactRules(wrap("rules", UPSTREAM_RULES.join("\n"))).text;
	assert.equal(compactRules(once).text, once);

	const toolsOnce = compactTools(wrap("tools", UPSTREAM_TOOLS.join("\n"))).text;
	assert.equal(compactTools(toolsOnce).text, toolsOnce);
});

test("the rewrite tables stay unique and non-empty", () => {
	const needles = RULE_REWRITES.map(([needle]) => needle);
	assert.equal(new Set(needles).size, needles.length, "duplicate rule needle");
	for (const [needle, replacement] of RULE_REWRITES) {
		assert.ok(needle.length > 0);
		assert.ok(replacement.length > 0);
		assert.notEqual(replacement, needle, "replacement must not be the needle itself: " + needle);
	}
	for (const [name, snippet] of Object.entries(TOOL_SNIPPETS)) {
		assert.ok(name.length > 0 && snippet.length > 0);
		assert.ok(!snippet.includes("\n"), "tool snippet must stay on one line: " + name);
	}
});
