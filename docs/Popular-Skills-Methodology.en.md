# BaoCanMou Popular Skills Methodology

> BaoCanMou · [www.bcmsj.com](https://www.bcmsj.com) · Open source for exchange and learning

## Purpose

The popular-skill ranking is a discovery baseline. It helps users find AI Skills with meaningful adoption, community interest, ongoing maintenance, and relevance to BaoCanMou workflows. It is not a copy of a GitHub popularity list, an automatic installation list, security certification, quality guarantee, or endorsement.

## Public data sources

- **All-time and recent installs**: the public [skills.sh](https://skills.sh/) leaderboard, which uses anonymous CLI install telemetry for ranking.
- **Stars, forks, freshness, license identifier, description, and topics**: public repository metadata from the [GitHub REST API](https://docs.github.com/en/rest/repos/repos).
- **Official flag**: the `isOfficial` field in public skills.sh data. This indicates a source label, not a BaoCanMou security audit.

## Why “downloads + rating” is not enough

GitHub does not expose a universal per-Skill download or user-rating field. GitHub Release `download_count` only covers release assets, while Stars measure repository attention rather than user ratings. The catalog therefore keeps two separate scores:

- **Composite popularity score**: an objective view of public adoption and community signals.
- **BaoCanMou recommendation score**: an editorial score that adds maintenance, licensing clarity, metadata completeness, and relevance to BaoCanMou capability priorities.

The BaoCanMou score is a transparent project judgment. It is not presented as an official GitHub rating, and unverifiable claims are not treated as facts.

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

## BaoCanMou recommendation score v2

The recommendation score also ranges from 0 to 100:

Recommendation tiers are A (85 and above), B (75–84.9), and C (below 75). They support quick browsing and do not replace pre-installation review.

| Signal | Weight | BaoCanMou rationale |
| --- | ---: | --- |
| All-time installs | 30% | Rewards demonstrated adoption without letting historical size dominate |
| Recent installs | 20% | Surfaces new skills with current momentum |
| GitHub stars | 10% | Repository attention, deliberately limited because it is shared metadata |
| GitHub forks | 4% | Repository participation used only as a secondary signal |
| Repository freshness | 12% | Decays over two years so abandoned sources lose weight |
| Official flag | 4% | Source-trust hint, not a security audit |
| Licensing clarity | 8% | Checks for a recognizable repository SPDX identifier, not commercial suitability |
| Metadata completeness | 4% | Checks repository description and topics, not the quality of each Skill document |
| BaoCanMou capability fit | 8% | Prioritizes practical design, presentation, video, marketing, content, data visualization, and browser-automation work |

Results are ranked by the BaoCanMou recommendation score, then installs and name. A single repository may contribute at most 20 Skills so shared Stars and forks cannot dominate the catalog. Archived or disabled repositories are excluded.

Each entry receives up to four bilingual selection reasons, such as “High adoption,” “Fast recent growth,” “Actively maintained,” and “Clear repository license.” Missing licensing, stale maintenance, or limited repository metadata is preserved as a review flag; none of these signals is misrepresented as a code-security audit.

## Scheduled refresh

- GitHub Actions re-screens the catalog every Monday and Thursday at 08:10 Asia/Shanghai.
- Ranking tests run before public data is fetched, and the generated 300-entry catalog is structurally validated.
- A commit is created only when rankings or metadata change meaningfully; timestamp-only churn is suppressed.
- Bilingual digest files record the top 30, rank movement, recommendation score, and selection reasons.
- Catalog refreshes never auto-install Skills into Codex, Claude, or other tools. Installation remains user-controlled and subject to source, dependency, permission, and rollback review.

## Boundaries and safety

- Popular does not mean safe or suitable for a particular workflow.
- No ranked Skill is installed automatically. Users inspect the source and `SKILL.md`, then choose whether to install it.
- Repository stars and forks are shared by every Skill from that repository, so they remain secondary signals.
- Repository license, description, topics, and freshness are also shared metadata and cannot replace inspection of an individual `SKILL.md`.
- Source-format changes, API limits, or repository deletion may cause temporary gaps. The generator refuses to replace the existing snapshot with an incomplete leaderboard.
- Before installing a third-party Skill, inspect dependencies, scripts, network calls, write scope, and licensing.

## Reproduction

```bash
npm run test:featured
node scripts/fetch-featured-skills.mjs
```

The algorithm, weights, source URLs, and generation time are recorded in `featured-skills.json` for auditing and reproduction.
