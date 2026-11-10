# Changelog

## [0.1.1]

### Added

- `/context-slim` reports what the last request rewrote, which tool descriptions shrank, and which rule sentences found no line.
- A one-time warning when the prompt declares a goal tool but a goal rule rewrite no longer matches, so drift is visible instead of silent.
- Fixture tests over lines captured from a live prompt (`npm test`, `node --test`, no dependencies).

### Changed

- The rewrite tables and the section transforms live in `src/compact.ts` as pure functions that report what applied and what matched nothing.
- The shortened rule lines keep the constraints the model has to satisfy: task tree shape and limits, immutability of completed tasks, never skipping to avoid work. The previous one-line replacements dropped them.
- The hook returns the message list instead of relying on in-place mutation.
- The peer dependency asks for `>=0.87.0`, the Pi version that introduced `context_with_system`.

### Fixed

- Every system message carrying `tools` or `rules` is rewritten, not only the leading one. Pi appends section patches mid-session, and those went out at full length.
- Remove the `codemode_titles` rewrite. That section comes from `pi-codemode-render`, not from Pi, so the branch was live; shortening its guideline saved about 30 tokens while dropping the `// <what this script does>` format, the ordering of a `// @options:` line, and the reason the model complies.

### Documentation

- Document the two prompt sections the extension rewrites, the full tool-snippet and rule-rewrite tables, and the per-request lifecycle (Pi deep-copies the message list, so the transcript keeps the original prompt).
- Record the measured saving and the Pi version requirement.
- List the limitations: replacements match upstream substrings, a replaced tool line loses its usage hints, a forced system prompt has no sections, and there is no configuration.
- Fix the removal command (`pi remove npm:pi-context-slim`) and add a verification recipe.

## [0.1.0]

### Added

- Initial npm package for compacting redundant Pi prompt metadata.
