import assert from "node:assert/strict";
import test from "node:test";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import contextSlim from "../src/index.ts";

type Handler = (event: { messages: unknown[] }, ctx: unknown) => unknown;

interface FakePi {
	pi: ExtensionAPI;
	/** Fire a context_with_system event; returns what the extension returned. */
	emit: (messages: unknown[], ctx?: unknown) => Promise<{ messages?: unknown[] } | undefined>;
	/** Run a registered command and collect the notifications it produced. */
	run: (name: string) => Promise<string[]>;
}

const GOAL_TOOL_LINE = "- create_goal: Create a goal only when explicitly requested.";
const LONG_RULE = "- start requires pending and sets current task. complete requires evidence; completed tasks are immutable.";

function fakePi(): FakePi {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, { handler: (args: string, ctx: unknown) => Promise<void> }>();
	let notifications: string[] = [];
	const ctx = {
		hasUI: true,
		ui: {
			notify: (message: string) => {
				notifications.push(message);
			},
		},
	};
	const pi = {
		on: (event: string, handler: Handler) => {
			handlers.set(event, handler);
			return () => handlers.delete(event);
		},
		registerCommand: (name: string, options: { handler: (args: string, ctx: unknown) => Promise<void> }) => {
			commands.set(name, options);
		},
	} as unknown as ExtensionAPI;
	contextSlim(pi);

	return {
		pi,
		emit: async (messages, eventCtx = ctx) => {
			const result = await handlers.get("context_with_system")?.({ messages }, eventCtx);
			return result as { messages?: unknown[] } | undefined;
		},
		run: async (name) => {
			notifications = [];
			await commands.get(name)?.handler("", ctx);
			return notifications;
		},
	};
}

function system(sections: Record<string, string>): { role: "system"; content: string; sections: Record<string, string>; timestamp: number } {
	return { role: "system", content: "", sections, timestamp: 0 };
}

test("it rewrites the leading message and returns the transcript", async () => {
	const { emit } = fakePi();
	const message = system({ tools: "- create_goal: " + "Create a goal only when explicitly requested.", rules: LONG_RULE });

	const result = await emit([message]);

	assert.equal(result?.messages?.[0], message);
	assert.ok(message.sections.tools.includes("- create_goal: Create a goal only on explicit request."));
	assert.ok(!message.sections.rules.includes("start requires pending and sets current task"));
});

test("it rewrites section patches appended after the leading message", async () => {
	const { emit } = fakePi();
	const leading = system({ tools: "- create_goal: Create a goal only when explicitly requested.", rules: LONG_RULE });
	const patch = system({ tools: GOAL_TOOL_LINE });

	await emit([leading, patch]);

	assert.ok(leading.sections.tools.includes("- create_goal: Create a goal only on explicit request."));
	assert.ok(patch.sections.tools.includes("- create_goal: Create a goal only on explicit request."));
});

test("it leaves sections it does not own alone", async () => {
	const { emit } = fakePi();
	const titles = "Start every codemode script with a one-line comment in the language the user writes in.";
	const message = system({ rules: LONG_RULE, codemode_titles: titles, docs: "- read docs" });

	await emit([message]);

	assert.equal(message.sections.codemode_titles, titles);
	assert.equal(message.sections.docs, "- read docs");
});

test("it warns once when goal tools are declared but a rule rewrite matched nothing", async () => {
	const { emit } = fakePi();
	const notifications: string[] = [];
	const ctx = { hasUI: true, ui: { notify: (message: string) => notifications.push(message) } };
	const message = system({ tools: GOAL_TOOL_LINE, rules: "- Be concise in your responses" });

	await emit([message], ctx);
	await emit([message], ctx);

	assert.equal(notifications.filter((text) => text.includes("no longer match")).length, 1);
	assert.match(notifications[0], /rule rewrite/);
});

test("it stays quiet when no goal tool is declared", async () => {
	const { emit } = fakePi();
	const notifications: string[] = [];
	const ctx = { hasUI: true, ui: { notify: (message: string) => notifications.push(message) } };

	await emit([system({ tools: "- read: Read a file", rules: "- Be concise in your responses" })], ctx);

	assert.deepEqual(notifications, []);
});

test("/context-slim reports what the last request rewrote", async () => {
	const { emit, run } = fakePi();
	await emit([system({ tools: GOAL_TOOL_LINE, rules: LONG_RULE })]);
	await emit([system({ tools: GOAL_TOOL_LINE, rules: "- Be concise in your responses" })]);

	const [report] = await run("context-slim");

	assert.match(report, /system message\(s\) rewritten/);
	assert.match(report, /tools: 1 rewritten/);
	assert.match(report, /rules not matched: .*"start requires pending"/);
});

test("/context-slim explains itself before the first request", async () => {
	const { run } = fakePi();
	const [report] = await run("context-slim");

	assert.match(report, /no request yet/);
});
