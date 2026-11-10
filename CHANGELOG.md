# Changelog

## [Unreleased]

### Documentation

- Document the three prompt sections the extension rewrites, the full tool-snippet and rule-rewrite tables, and the per-request lifecycle (Pi deep-copies the message list, so the transcript keeps the original prompt).
- Record the measured saving and the Pi version requirement (`context_with_system`, Pi 0.87.0+).
- List the limitations: only the leading system message is rewritten, replacements match upstream substrings, a replaced rule line loses its extra detail, and `codemode_titles` is not emitted by current Pi versions.
- Fix the removal command (`pi remove npm:pi-context-slim`) and add a verification recipe.

## [0.1.0]

### Added

- Initial npm package for compacting redundant Pi prompt metadata.
