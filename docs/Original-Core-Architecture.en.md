# BaoCanMou v1.0 Original Core Architecture

The application turns local Skills into understandable, assessable, routable, and verifiable personal capability assets. It values bilingual clarity, real filesystem state, safety boundaries, and maintainability rather than installation volume.

## Fangce Five-Loop

```text
local center → discover → interpret → assess → route → verify
```

The runtime-generated `SkillAsset` model includes bilingual names and descriptions, primary purpose, feature labels, category, file count, content hash, Fangce score, risk signals, preview type, and connection state for every supported AI tool.

## Explainable score

- Structure: 25
- Understanding: 20
- Portability: 20
- Safety signals: 20
- Verifiability: 15

The score is not a security certification, quality warranty, or user rating.

## File safety

The core rejects nested identifiers and path escape, limits `SKILL.md` to 512 KB, limits preview images to 2 MB, accepts only PNG/JPG/WebP/GIF, never executes Skill content during inspection, and refuses to overwrite or remove unmanaged targets.
