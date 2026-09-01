# BaoCanMou AI Skill Center

[简体中文](README.md) · [English](README.en.md)

> BaoCanMou · [www.bcmsj.com](https://www.bcmsj.com) · Open source for exchange and learning

BaoCanMou AI Skill Center is a local-first desktop application for governing AI capabilities across tools. It reads the user's own `~/.agents/skills`, adds Chinese names, explicit purposes, feature labels, and risk signals, then connects selected Skills to Codex, Claude Code, Gemini CLI, Cursor, Hermes, ZCode, OpenCode, and Windsurf.

## Original v1.0 core

The BaoCanMou “Fangce Five-Loop” model defines the v1.0 product logic:

1. **Discover** local facts from the center and real tool paths.
2. **Interpret** Skills in Chinese while preserving English IDs and contracts.
3. **Assess** structure, understanding, portability, safety, and verifiability.
4. **Route** Skills through controlled links or a marked Windows fallback copy.
5. **Verify** by rescanning the filesystem after every connection change.

The v1.0 application does not include the previous project's database, installer, sync engine, or interface modules. Its core is implemented in [`src-tauri/src/center.rs`](src-tauri/src/center.rs) and [`src/App.tsx`](src/App.tsx).

![BaoCanMou AI Skill Center v1.0 command view reading 194 local Skills](docs/assets/app-v1-overview.png)

## Every Skill is understandable

- Chinese primary name with the original English name and directory ID.
- A clear primary use and up to five feature labels.
- The primary use and up to three feature labels appear directly on every card, without a decorative hero image hiding the information.
- A real PNG/JPG/WebP/GIF screenshot appears only as supplementary detail when the Skill folder provides one.
- Editable Chinese text stored locally in `~/.baocanmou/skill-center/translations.json` without modifying third-party `SKILL.md` files.

![BaoCanMou AI Skill Center asset view](docs/assets/app-v1-assets.jpg)

The detail view keeps the primary use, feature labels, Chinese interpretation, tool routing, and source content together. Real screenshots remain supplementary when provided by the Skill itself.

![BaoCanMou AI Skill Center detail view](docs/assets/app-v1-skill-detail.jpg)

## External capability intelligence

The intelligence view contains public metrics, original source references, and a BaoCanMou recommendation score only. It does not bundle or automatically install third-party Skills. The score supports discovery; it is not a user rating, security certification, or rights statement.

## Safe defaults

- No Skill-content upload.
- No automatic external installation.
- No overwrite of unmanaged targets.
- No deletion of center-source Skills.
- Single-level safe Skill identifiers only.
- 512 KB reading limit for `SKILL.md` and 2 MB limit for preview images.
- Static signals are not security certification.

## Development

Requires Node.js 20+, Rust 1.77.2+, and the system dependencies required by Tauri 2.

```bash
npm ci
npm run tauri:dev
npm run check
```

Read-only inventory summary:

```bash
cargo run --manifest-path src-tauri/Cargo.toml -- --inspect-summary
```

## Open source and rights

BaoCanMou-authored project code is licensed under the [MIT License](LICENSE). The “包参谋 / BaoCanMou” name, `www.bcmsj.com`, and project graphic mark are not licensed as brands with the code.

General dependencies such as React and Tauri remain governed by their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). External repositories and Skills referenced by the intelligence index remain the property of their respective rights holders.

Copyright © 2026 BaoCanMou contributors.
