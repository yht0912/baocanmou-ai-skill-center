# BaoCanMou Popular Skills Methodology

> BaoCanMou · [www.bcmsj.com](https://www.bcmsj.com) · Open source for exchange and learning

## Purpose

The popular-skill ranking is a discovery baseline. It helps users find AI Skills with meaningful adoption, community interest, and ongoing activity. It is not an automatic installation list, security certification, quality guarantee, or endorsement.

## Public data sources

- **All-time and recent installs**: the public [skills.sh](https://skills.sh/) leaderboard, which uses anonymous CLI install telemetry for ranking.
- **Stars, forks, and freshness**: public repository metadata from the [GitHub REST API](https://docs.github.com/en/rest/repos/repos).
- **Official flag**: the `isOfficial` field in public skills.sh data. This indicates a source label, not a BaoCanMou security audit.

GitHub does not expose a universal per-Skill download or user-rating field. The `download_count` field for GitHub Releases applies only to release assets. This project therefore does not relabel repository stars as Skill downloads or invent user ratings.

## Composite popularity score v1

Scale metrics are logarithmically normalized before the following 0–100 weighted score is calculated:

| Signal | Weight | Meaning |
| --- | ---: | --- |
| All-time installs | 55% | Per-Skill install count from skills.sh |
| Recent installs | 20% | Sum of the recent install series published by skills.sh |
| GitHub stars | 12% | Source repository attention |
| GitHub forks | 5% | Source repository participation |
| Repository freshness | 5% | Latest push, decaying to zero over two years |
| Official flag | 3% | Official-source label published by skills.sh |

Results are sorted by score, then all-time installs, then name for stable output. A GitHub Actions workflow rebuilds the ranking daily. The app retains a bundled snapshot and local cache for offline use.

## Boundaries and safety

- Popular does not mean safe or suitable for a particular workflow.
- No ranked Skill is installed automatically. Users inspect the source and `SKILL.md`, then choose whether to install it.
- Repository stars and forks are shared by every Skill from that repository, so they remain secondary signals.
- Source-format changes, API limits, or repository deletion may cause temporary gaps. The generator refuses to replace the existing snapshot with an incomplete leaderboard.
- Before installing a third-party Skill, inspect dependencies, scripts, network calls, write scope, and licensing.

## Reproduction

```bash
npm run test:featured
node scripts/fetch-featured-skills.mjs
```

The algorithm, weights, source URLs, and generation time are recorded in `featured-skills.json` for auditing and reproduction.
