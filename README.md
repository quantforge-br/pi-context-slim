# pi-context-slim

A Pi extension that shortens the prompt lines of optional tools before each request, without removing tools or changing their schemas, arguments, results, or execution.

Pi builds its system prompt from named sections (`preamble`, `tools`, `rules`, `docs`, `skills`, `project_context`, `cwd`, plus any section an extension adds). Installed packages contribute long guideline lines to those sections: web research hints, goal and task guardrails, goal drafting rules. Every request pays for them, in every session. This extension replaces the longest ones with shorter equivalents that keep the operative rule.

## What it does

It hooks `context_with_system`, which Pi fires before each model request, after every other extension has contributed its prompt sections. For the leading system message it rewrites two sections in place:

| Section | Change |
|---|---|
| `tools` | Replaces the description line of 13 optional tools with a shorter sentence |
| `rules` | Replaces 7 guideline lines whose text contains a known upstream sentence |

Matching is line-based and exact: only a line starting with `- <tool>: ` is replaced, and only the matching `rules` line is swapped. Everything else in the section — including Pi's `<tools>`/`<rules>` wrappers — is left untouched.

### Tool descriptions

| Tool | Replacement |
|---|---|
| `web_search` | Search the web for current external information. |
| `source_check` | Gather cited source evidence. |
| `fetch_content` | Fetch content from a URL or file. |
| `get_search_content` | Read stored search or fetched content. |
| `web_enable` | Enable web tools when current external information is needed. |
| `get_goal` | Read goal state or omitted requirements. |
| `create_goal` | Create a goal only on explicit request. |
| `update_goal` | Update goal status or continuation. |
| `set_goal_tasks` | Set goal tasks with confirmation. |
| `update_goal_task` | Update goal task progress. |
| `goal_question` | Ask one goal-drafting question. |
| `goal_questionnaire` | Ask goal-drafting questions. |
| `propose_goal_draft` | Propose a goal draft for confirmation. |

Tools that are not installed are not affected: the replacement only applies when the line exists.

### Rule lines

A rule line is rewritten when it contains one of these upstream sentences. The replacement is the whole line, so any extra detail the original carried on that line is dropped.

| Matched upstream text | Replacement |
|---|---|
| Never infer persistent goals | Create goals only on explicit request; preserve the objective; never invent a token budget. |
| Use tasks only for useful milestones | Use goal tasks only for useful milestones; restructure them only when requested or requirements change. |
| start requires pending | Complete goal tasks only with evidence; skip only with a reason and explicit direction. |
| Use only during /goal | Use goal drafting tools only during /goal, /sisyphus, or /goal-tweak; clarify ambiguity first. |
| Clarify ambiguity before proposing | Clarify ambiguity before proposing a goal draft. |
| Set token_budget only when | Set token_budget only on explicit request; confirm the draft. |
| Confirmation creates or revises | Confirm goal drafts atomically. |

The invariants worth keeping are still stated: goals only on request, a faithful objective, evidence before completion, drafting only inside the goal commands, confirmation of the draft.

## What it does not change

- The tool set, tool order, parameter schemas, and tool results.
- Any other prompt section: `preamble`, `docs`, `skills`, `project_context`, `cwd`, `addendum`, and sections added by other extensions.
- Your session history. Pi deep-copies the message list before handing it to `context_with_system` handlers, so the rewrite touches only the request being built. The JSONL transcript keeps the original prompt, and the compaction is re-applied on every request instead of accumulating.

The rewrite is a deterministic function of the prompt sections, so the request prefix stays stable between turns, which keeps provider prompt caching intact.

## Measured effect

On a setup with `pi-web-access` and `pi-goal-x` loaded, the `tools` and `rules` sections of one prompt went from 44,209 to 43,244 characters: about 1 KB, roughly 250 tokens per request. The saving scales with how many long guideline lines are installed; a setup with none of these packages sees little or no change.

## Requirements

Pi needs the `context_with_system` extension event, added in 0.87.0 (2026-09-21). Verified against Pi 1.5.1. The peer dependency is declared as `*`, so keep Pi recent.

## Install

```sh
pi install npm:pi-context-slim
```

One invocation only:

```sh
pi -e npm:pi-context-slim
```

Pi loads the package through its `pi.extensions` manifest. Start a new session or run `/reload`.

## Remove

```sh
pi remove npm:pi-context-slim
```

## Verify

The prompt a request actually carries is observable from an extension. A throwaway extension hooking `context_with_system` or `before_provider_request` can log it:

```ts
import { getCurrentSystemPrompt } from "@earendil-works/pi-ai";

export default function logPrompt(pi) {
  pi.on("context_with_system", (event) => {
    console.log(getCurrentSystemPrompt(event.messages));
  });
}
```

Compare the `tools` and `rules` sections with the extension disabled: remove it (`pi remove npm:pi-context-slim`) and run the same logging extension again.

## Limitations

- Only the leading system message is rewritten. If Pi appends a later system message carrying a section patch (for example after the tool set changes mid-session), that patch is left as it is.
- Replacements match upstream substrings. If a package rewords its guideline, the corresponding replacement silently stops applying — no error, the original line is simply kept.
- A rule line is replaced as a whole, so detail the upstream line carried beyond the matched sentence (task tree shape limits, skip conditions, argument hints) is removed on purpose. Review the table above before relying on it.
- A forced system prompt (`forceSystemPrompt`, or a custom prompt) lives in the message `content` and has no sections, so there is nothing to compact.
- No configuration. To compact a different set, edit `src/index.ts`.

## Development

```sh
npm install --ignore-scripts
npm run check          # node --check: syntax only, no type checking
npm pack --dry-run
```

Layout:

```text
src/index.ts    the extension: tool snippets, rule rewrites, hook
```

The package has no runtime dependencies. Pi provides `@earendil-works/pi-coding-agent` for the extension types at load time, and `@earendil-works/pi-ai` for the prompt helpers used in the verification snippet.

Publishing:

```sh
npm version patch
git tag pi-context-slim-vX.Y.Z
npm publish
```

## License

MIT
