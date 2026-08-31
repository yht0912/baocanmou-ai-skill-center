# 包参谋 AI 技能中心

[简体中文](README.md) · [English](README.en.md)

> 包参谋 · [www.bcmsj.com](https://www.bcmsj.com) · 开源交流学习使用

一套面向 Codex、Claude Code 和其他 AI 软件的本地优先技能治理中心。它把散落的 `SKILL.md` 能力收拢为一套可发现、可阅读、可同步、可审计、可回滚的个人 AI 能力资产。

## 包参谋原创创新层

- **「方策」品牌识别**：以“方格中的策略路径”为核心的图标、应用图标和极简界面语言。
- **中文语义显示层**：英文 Skill ID、目录名和调用契约保持兼容，同时提供中文名称与中文理解入口。
- **一源多端治理**：默认以 `~/.agents/skills` 为中心源，为 Codex、Claude Code、Gemini CLI、Cursor、OpenCode、ZCode 等工具编组。
- **本地优先与零内容上云**：技能内容留在用户设备；应用本身不建立远端技能数据库。
- **安全更新闭环**：安装、同步、审计、版本更新和可恢复隔离形成一套治理流程。
- **中英双语开源交付**：公开中文主文档与独立英文版本，便于中文使用和国际协作。

更完整的原创范围、上游边界和品牌使用规则见[《知识产权与原创创新说明》](docs/知识产权与原创创新说明.zh-CN.md)。

## 核心能力

- 可视化管理、搜索、分类和阅读本地 Skills。
- 保留英文标识符，优先展示中文名称；没有人工映射时使用可预测的中文回退。
- 识别现有 Codex、Claude 等工具入口，不复制或覆盖中心源。
- 同步优先采用软链接或目录联接，必要时才退化为副本。
- 删除前移动到可恢复隔离区，移动失败即中止。
- 附带只读审计器，检查 `SKILL.md`、链接状态、Git 来源和 SHA-256。
- 支持浅色、深色与跟随系统主题。
- 内置每周复筛两次的包参谋推荐榜：保留 skills.sh 安装量与 GitHub 社区热度，同时加入维护度、许可证清晰度、资料完整度和包参谋能力方向，生成可解释的推荐分与中英文入选理由。

推荐榜只用于发现，不代表 GitHub 用户评分、安全认证或质量背书；算法、权重与数据边界见[《热门技能榜单方法》](docs/热门技能榜单方法.zh-CN.md)，当前前 30 名与变化见[《包参谋热门技能观察》](docs/包参谋热门技能观察.md)。

## 快速开始

需要 Node.js 20+、Rust 1.77.2+，以及 [Tauri 2](https://v2.tauri.app/start/prerequisites/) 对应平台的系统依赖。

```bash
git clone https://github.com/yht0912/baocanmou-ai-skill-center.git
cd baocanmou-ai-skill-center
npm ci
npm run tauri:dev
```

仅启动网页开发界面：

```bash
npm run dev
```

## 质量检查

```bash
npm run check
```

该命令依次执行 ESLint、Vitest、Python 审计器测试、TypeScript/Vite 构建、Rust 格式检查、Clippy 和 Rust 测试。

更新热门技能底座：

```bash
npm run test:featured
node scripts/fetch-featured-skills.mjs
```

只读审计现有中心技能源：

```bash
python3 tools/skill_center_audit.py
python3 tools/skill_center_audit.py --format json --output /tmp/skill-audit.json
```

## 目录

```text
src/                              React 界面与中文显示层
src-tauri/src/                    Rust / Tauri 本地治理后端
tools/skill_center_audit.py       只读技能审计器
skills/baocanmou-ai-skill-center  跨 AI 治理 Skill
docs/                             设计、使用、兼容和知识产权文档
```

## 开源来源与知识产权边界

本项目基于 MIT 许可的 [qufei1993/skills-hub](https://github.com/qufei1993/skills-hub) 定制，公开基线为 `9d9f490f8ae0a3f91d714867cffe3927ada6e8ae`。上游版权和 MIT 许可完整保留，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

包参谋对其新增代码、中文语义层、视觉系统、文档和产品方案主张相应著作权；“包参谋 / BaoCanMou”名称及「方策」图形标识不因代码开源而自动获得商标或品牌授权。项目代码采用 [MIT License](LICENSE)；“开源交流学习使用”是项目定位，不增加与 MIT 冲突的使用限制。

## 参与贡献

请阅读[中文贡献指南](CONTRIBUTING.zh-CN.md)或 [English Contributing Guide](CONTRIBUTING.md)。安全问题请按 [SECURITY.md](SECURITY.md) 私密报告。

---

Copyright © 2026 BaoCanMou（包参谋）贡献者。
