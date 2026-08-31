# Contributing to BaoCanMou AI Skill Center

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping improve a bilingual, local-first AI skill governance system.

## Development requirements

- Node.js 20+
- Rust 1.77.2+
- Tauri 2 system dependencies for macOS, Windows, or Linux

## Run locally

```bash
npm ci
npm run tauri:dev
```

## Required checks

Run the complete check before opening a pull request:

```bash
npm run check
```

## Compatibility rules

- Keep English Skill IDs, directory names, and `SKILL.md` invocation contracts stable.
- Add Chinese display names in the display layer instead of renaming installed skill directories.
- Treat `~/.agents/skills` as the default central source; never copy or overwrite a user's existing center by default.
- Refuse synchronization when the source and destination resolve to the same path.
- Do not overwrite an existing unmanaged link, junction, or directory.
- Keep destructive operations recoverable and covered by tests.

## Pull requests

- Keep each pull request focused.
- Explain user-visible behavior in both Chinese and English when documentation is affected.
- Include screenshots for meaningful interface changes.
- Do not commit `.env` files, tokens, cookies, private keys, local paths, private Skill content, caches, or build artifacts.
- Identify third-party code and retain its license and attribution.

## Brand boundary

The code is MIT-licensed. The BaoCanMou name and Fangce mark are not granted for branding derivative distributions. See [Intellectual Property and Original Innovation](docs/Intellectual-Property-and-Innovation.en.md).

## Issues and security

Use GitHub Issues for reproducible bugs and feature proposals. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
