# BaoCanMou AI Skill Center

[简体中文](README.md) · [English](README.en.md)

> BaoCanMou · [www.bcmsj.com](https://www.bcmsj.com) · Open source for exchange and learning

A local-first skill governance center for Codex, Claude Code, and other AI tools. It turns scattered `SKILL.md` capabilities into personal AI assets that can be discovered, read, synchronized, audited, and rolled back.

## Original BaoCanMou innovation layer

- **Fangce brand system**: an original “strategy path inside a square” mark, desktop icon, and minimalist interface language.
- **Chinese semantic display layer**: English Skill IDs, directory names, and invocation contracts remain compatible while Chinese names and explanations are added for browsing.
- **One source, many tools**: `~/.agents/skills` is the default center, with governed connections to Codex, Claude Code, Gemini CLI, Cursor, OpenCode, ZCode, and other tools.
- **Local-first, no skill-content cloud**: skill content stays on the user's device; the app does not operate a remote skill-content database.
- **Safe governance loop**: installation, synchronization, audit, updates, and recoverable quarantine form one workflow.
- **Bilingual open-source delivery**: the public project includes a Chinese primary edition and a maintained English edition.

See [Intellectual Property and Original Innovation](docs/Intellectual-Property-and-Innovation.en.md) for the complete authorship, upstream, and brand boundaries.

## Core capabilities

- Visually manage, search, classify, and read local Skills.
- Preserve English identifiers while displaying Chinese names first; use a predictable Chinese fallback when no curated mapping exists.
- Discover existing Codex, Claude, and other tool entries without copying or overwriting the central source.
- Prefer symbolic links or directory junctions for synchronization and fall back to copies only when necessary.
- Move deleted skills to a recoverable quarantine and stop if the move fails.
- Audit `SKILL.md` structure, link state, Git source, and SHA-256 without changing audited files.
- Support light, dark, and system themes.
- Include a daily popular-skill baseline led by per-Skill installs from skills.sh and enriched with GitHub stars, forks, and freshness in a transparent composite score.

The ranking supports discovery only and is not a security or quality endorsement. See [Popular Skills Methodology](docs/Popular-Skills-Methodology.en.md) for the algorithm, weights, and data boundaries.

## Quick start

You need Node.js 20+, Rust 1.77.2+, and the platform dependencies listed in the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
git clone https://github.com/yht0912/baocanmou-ai-skill-center.git
cd baocanmou-ai-skill-center
npm ci
npm run tauri:dev
```

Run only the web development interface:

```bash
npm run dev
```

## Quality checks

```bash
npm run check
```

This runs ESLint, Vitest, the Python auditor tests, the TypeScript/Vite build, Rust format checks, Clippy, and Rust tests.

Refresh the popular-skill baseline:

```bash
npm run test:featured
node scripts/fetch-featured-skills.mjs
```

Audit the central skill source without modifying it:

```bash
python3 tools/skill_center_audit.py
python3 tools/skill_center_audit.py --format json --output /tmp/skill-audit.json
```

## Project structure

```text
src/                              React interface and Chinese display layer
src-tauri/src/                    Rust / Tauri local governance backend
tools/skill_center_audit.py       Read-only skill auditor
skills/baocanmou-ai-skill-center  Cross-AI governance Skill
docs/                             Design, usage, compatibility, and IP documents
```

## Open-source origin and IP boundary

This project is customized from MIT-licensed [qufei1993/skills-hub](https://github.com/qufei1993/skills-hub), using commit `9d9f490f8ae0a3f91d714867cffe3927ada6e8ae` as its public baseline. The upstream copyright and MIT terms are retained in full; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

BaoCanMou claims the applicable copyright in its added code, Chinese semantic layer, visual system, documentation, and product design. The names “包参谋 / BaoCanMou” and the Fangce graphic mark are not licensed as trademarks or brands merely because the code is open source. The code is released under the [MIT License](LICENSE). “Open source for exchange and learning” describes the project's purpose and does not add restrictions that conflict with MIT.

## Contributing

Read the [English Contributing Guide](CONTRIBUTING.md) or [中文贡献指南](CONTRIBUTING.zh-CN.md). Please report security issues privately as described in [SECURITY.md](SECURITY.md).

---

Copyright © 2026 BaoCanMou contributors.
