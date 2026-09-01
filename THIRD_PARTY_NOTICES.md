# 第三方依赖声明 / Third-Party Dependency Notice

包参谋 AI 技能中心 v1.0 的产品逻辑与项目源码由包参谋维护。构建过程使用通用开源依赖，包括 React、Tauri、Lucide、Serde、SHA-2 及其传递依赖；这些软件继续适用各自随包发布的许可证。

准确依赖版本以 `package-lock.json` 与 `src-tauri/Cargo.lock` 为准。发布者和再分发者应使用 npm 与 Cargo 的许可证审计工具生成对应版本的完整依赖许可清单。

`featured-skills.json` 只保存外部能力索引与公开指标，不包含对应 Skill 源码。索引中的名称、仓库、描述和许可证字段用于识别与审计，相关权利仍归各自权利人所有。

---

BaoCanMou AI Skill Center v1.0 uses general open-source dependencies including React, Tauri, Lucide, Serde, SHA-2, and their transitive dependencies. They remain governed by their respective licenses distributed with those packages.

See `package-lock.json` and `src-tauri/Cargo.lock` for exact versions. Distributors should generate a version-matched license inventory with npm and Cargo license-audit tooling.

`featured-skills.json` contains external index metadata and public signals only, not the referenced Skill source code. Names, repositories, descriptions, and license fields remain attributable to their respective rights holders.
