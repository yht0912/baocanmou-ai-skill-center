# 包参谋 AI 技能中心开发规则

## 产品定位

本项目是基于 Skills Hub 定制的个人全中文 AI 技能治理桌面端。中心技能源默认为 `~/.agents/skills`，任何改动不得默认迁移、复制或覆盖用户已有技能。

## 技术栈

- 前端：React 19、TypeScript 5.9 严格模式、Vite 7、Tailwind CSS 4。
- 桌面端：Tauri 2。
- 后端：Rust 2021，最低 Rust 1.77.2。
- 本地数据：SQLite/rusqlite。
- Git：libgit2/git2。
- 网络：reqwest + rustls。

## 常用命令

```bash
npm run dev
npm run tauri:dev
npm run audit:skills
npm run check
npm run tauri:build:mac:dmg
```

任务交付前必须运行 `npm run check`。涉及安装包的变更还要实际构建 DMG 并记录 SHA-256。

## 架构边界

- `src/`：React 界面和 IPC 调用。
- `src-tauri/src/commands/`：Tauri 命令、DTO 转换和错误格式化，不放核心业务逻辑。
- `src-tauri/src/core/`：可独立测试的安装、同步、存储、适配器、更新与审计逻辑。
- `tools/`：只读审计工具与其单元测试。
- `skills/`：供 Codex、Claude 等 AI 使用的配套治理 Skill。

新增 Tauri 命令必须同时在命令模块和 `lib.rs` 中注册。前后端 DTO 字段必须保持一致。

## 中文界面

- 用户可见界面固定使用简体中文。
- 新文案仍通过 `src/i18n/resources.ts` 中的翻译键管理，不在组件中散落长文案。
- 保留英文资源是为了降低合并上游的成本，不恢复语言切换入口。
- 样式优先使用 `src/index.css` 设计变量和 `src/figma.css` 语义类名，保持浅色/深色两套主题。

## 文件和安全

- 对现有中心技能只做登记，不复制、不重命名、不覆盖。
- 同步目标与中心源是同一路径时必须拒绝操作。
- 目标已存在且不是本应用管理的链接时，不自动覆盖。
- 删除中心技能必须先移入 `~/.agents/backups/skill-center-trash/`；移动失败则中止。
- 不把 Token、Cookie、密码、私钥、`.env` 或浏览器配置写入源码、测试、文档或审计产物。
- 不恢复上游桌面端自动更新；个人定制版通过 Git 差异审核后手工升级。

## 测试要求

- TypeScript 开启 `noUnusedLocals` 和 `noUnusedParameters`，未使用符号会导致构建失败。
- Rust 新核心模块必须在 `core/mod.rs` 导出并配有独立测试。
- 路径逻辑覆盖 macOS/Linux 软链接和 Windows 目录联接/副本退化的原有测试。
- 只读审计器不得修改被审计目录，测试使用临时目录。
- 完整检查通过只代表代码层验证完成；实际交付还要启动成品、检查界面、运行真实只读审计并核对 DMG 哈希。
