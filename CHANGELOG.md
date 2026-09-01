# Changelog

## [1.0.0] - 2026-09-01

### Added

- Original BaoCanMou Fangce Five-Loop governance core.
- Bilingual interface and editable Chinese understanding for every local Skill.
- Clear purpose and feature labels for every capability.
- Real local screenshot preview with an explicitly generated fallback card.
- Read-only JSON inventory mode for acceptance and automation.

### Changed

- Replaced the previous database, installer, sync engine, and interface modules.
- Changed external recommendations to an index-only, manual-review model.
- Reduced permissions and dependencies to a local-first minimum.

### Removed

- Automatic external Skill installation.
- Remote Skill-content handling.
- Legacy project documents and historical interface assets from the current source tree.

### Security

- Added path-containment checks, file-size limits, managed-target protection, and static risk signals.
