# Changelog

## [Unreleased]

### Fixed

- Remove the `codemode_titles` rewrite. Current Pi versions never emit that prompt section, so the branch was dead code that never changed a request.

### Documentation

- Document the two prompt sections the extension rewrites, the full tool-snippet and rule-rewrite tables, and the per-request lifecycle (Pi deep-copies the message list, so the transcript keeps the original prompt).
- Record the measured saving and the Pi version requirement (`context_with_system`, Pi 0.87.0+).
- List the limitations: only the leading system message is rewritten, replacements match upstream substrings, and a replaced rule line loses the extra detail it carried.
- Fix the removal command (`pi remove npm:pi-context-slim`) and add a verification recipe.

## [0.1.0]

### Added

- Initial npm package for compacting redundant Pi prompt metadata.
