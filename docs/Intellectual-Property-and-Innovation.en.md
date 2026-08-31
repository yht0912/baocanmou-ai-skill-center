# BaoCanMou AI Skill Center: Intellectual Property and Original Innovation

Version: 1.0  
Date: 2026-08-31  
Rights identity: BaoCanMou (包参谋)  
Official website: [www.bcmsj.com](https://www.bcmsj.com)

## 1. Purpose

This document records the original BaoCanMou work, open-source origin, and usage boundaries of BaoCanMou AI Skill Center. It supports code collaboration, release records, copyright evidence, and future brand management. It does not present third-party work as original BaoCanMou work, nor does it claim that any patent, trademark, or software copyright registration has been granted.

## 2. Original BaoCanMou work

Without affecting pre-existing third-party rights, BaoCanMou's original or independently added work primarily includes:

1. **Product positioning and information architecture**: reframing a general Skill manager as a personal AI capability governance center with a select–govern–assign–audit lifecycle.
2. **Fangce visual identity**: the graphic concept combining a square, path nodes, and strategic progress, plus the application icon, brand colors, typography, and minimalist “quiet inventory” interface language.
3. **Chinese semantic display layer**: curated Chinese display names, token fallback, bilingual browsing, and tests while preserving English Skill IDs, directories, and invocation contracts.
4. **Cross-AI central-source model**: using `~/.agents/skills` as the single source and treating Codex, Claude Code, and other AI tools as governed entry points to prevent long-term drift.
5. **Local-first safety design**: existing-skill registration, same-source protection, unmanaged-target protection, recoverable quarantine, broken-link detection, Git-source inspection, and SHA-256 auditing.
6. **BaoCanMou interaction and copy system**: the capability command board, plan/build/spread governance path, tool groups, capability assets, and risk language.
7. **Bilingual delivery system**: a Chinese primary edition, a standalone English edition, IP boundaries, user guidance, and public contribution rules.

Git commits, release tags, design files, and release records provide a traceable record of this work. Actual rights depend on the created material and applicable law.

## 3. Upstream and third-party boundary

Not all code in this project was written from scratch. The desktop application is based on MIT-licensed [qufei1993/skills-hub](https://github.com/qufei1993/skills-hub), with this public customization baseline:

```text
9d9f490f8ae0a3f91d714867cffe3927ada6e8ae
```

Upstream code, historical designs, and original documentation remain owned by their respective rights holders and continue to be governed by the MIT License. Third-party dependencies retain their own licenses. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## 4. Open-source license and brand rights

- Project code is released under the [MIT License](../LICENSE), including its permissions to use, copy, modify, merge, publish, distribute, sublicense, and sell subject to the license terms.
- “BaoCanMou · www.bcmsj.com · Open source for exchange and learning” describes the project's purpose and does not add a restriction that conflicts with MIT.
- The names “包参谋 / BaoCanMou,” the website identity, and the Fangce graphic mark are not automatically licensed as trademarks or brands under the MIT code license. Apart from accurate attribution, compatibility statements, or fair references, do not imply that a derivative is officially published, endorsed, or operated by BaoCanMou.
- Derivatives should retain the LICENSE and third-party notices and identify their own modifications and maintainers.

## 5. Recommended public wording

Recommended:

> BaoCanMou AI Skill Center is an original BaoCanMou customization built on the MIT-licensed Skills Hub project. BaoCanMou independently created the Chinese semantic layer, cross-AI governance model, Fangce visual system, dedicated interactions, and public bilingual documentation while retaining the upstream copyright and license.

Avoid:

> Every line of code was created from scratch by BaoCanMou.

That claim would conflict with the documented origin and weaken the project's credibility.

## 6. Registration and evidence

Git commits, release tags, source hashes, and design files can document creation time and version evolution. Copyright registration, trademark registration, or patent rights require separate applications where applicable and depend on the competent authority's final decision.

---

BaoCanMou · [www.bcmsj.com](https://www.bcmsj.com) · Open source for exchange and learning
