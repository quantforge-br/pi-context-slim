# pi-context-budget-optimizer

A Pi package that reduces redundant prompt metadata from optional tools without changing tool schemas or execution behavior.

## What it changes

- Shortens web-access tool snippets.
- Replaces long goal-tool guidelines with compact invariants.
- Preserves important rules for goal creation, task completion, and draft confirmation.
- Shortens the codemode script-title instruction.
- Rewrites the final system message during `context_with_system`, after package extensions have contributed their prompt sections.

It does not remove tools, alter tool arguments, change tool results, or change plugin execution.

## Install

Install from npm:

```sh
pi install npm:pi-context-budget-optimizer
```

Or try it for one invocation:

```sh
pi -e npm:pi-context-budget-optimizer
```

After installation, Pi loads the package through its `pi.extensions` manifest. Start a new session or run `/reload`.

## Development

```sh
npm install --ignore-scripts
npm run check
npm pack --dry-run
```

The package has no runtime dependencies. Pi provides `@earendil-works/pi-coding-agent` to extensions.
