# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-alpha.5] - 2026-09-27

### Breaking

- Requires an OpenCode v2 host. The TUI/context types moved from the legacy
  `@opencode-ai/plugin` package to `@opencode/plugin@^2.0.15`. The previously
  published `1.0.0-alpha.4` declared a peer range of `>=1.18.25 <2 ||
0.0.0-beta-19242`, which excluded v2 entirely — this release supersedes it.

### Changed

- Sidebar rendering and keymap wiring use the v2 `ui.slot` / `keymap.layer`
  contract.
- Moved to the v2 host plugin API via `opencode-plugin-kit@^1.0.0-alpha.6`,
  which reads connected providers from the host's integration list instead of
  scraping `auth.json`.

## [0.1.0] - 2026-09-08

### Added

- Sidebar section listing available Skills with collapsible UI

[Unreleased]: https://github.com/ranjithraj/opencode-skill-lister/compare/v1.0.0-alpha.5...HEAD
[1.0.0-alpha.5]: https://github.com/ranjithraj/opencode-skill-lister/releases/tag/v1.0.0-alpha.5
[0.1.0]: https://github.com/ranjithraj/opencode-skill-lister/releases/tag/v0.1.0
