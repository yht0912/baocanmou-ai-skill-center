# 参与包参谋 AI 技能中心

[简体中文](CONTRIBUTING.zh-CN.md) · [English](CONTRIBUTING.md)

感谢你一起完善这套中英双语、本地优先的 AI 技能治理系统。

## 开发环境

- Node.js 20+
- Rust 1.77.2+
- macOS、Windows 或 Linux 对应的 Tauri 2 系统依赖

## 本地运行

```bash
npm ci
npm run tauri:dev
```

## 必须通过的检查

提交 Pull Request 前运行：

```bash
npm run check
```

## 兼容规则

- 保持英文 Skill ID、目录名和 `SKILL.md` 调用契约稳定。
- 中文名称应写入显示层，不要重命名用户已安装的技能目录。
- 默认将 `~/.agents/skills` 视为中心源，不自动复制或覆盖用户现有中心技能。
- 源路径和目标路径解析为同一路径时，必须拒绝同步。
- 不覆盖既有且非本应用管理的软链接、目录联接或文件夹。
- 破坏性操作必须可恢复，并有测试覆盖。

## Pull Request 规则

- 每个 Pull Request 聚焦一个主题。
- 影响公开文档时，同时维护中文和英文说明。
- 明显的界面修改应附截图。
- 不提交 `.env`、Token、Cookie、私钥、本机路径、私人 Skill 内容、缓存或构建产物。
- 使用第三方代码时，明确来源并保留其许可与署名。

## 品牌边界

代码采用 MIT 许可；“包参谋 / BaoCanMou”名称和「方策」标识不自动授权给衍生发行版作为品牌使用。详见[《知识产权与原创创新说明》](docs/知识产权与原创创新说明.zh-CN.md)。

## Issue 与安全问题

可复现的缺陷和功能建议请提交 GitHub Issue；安全漏洞请按 [SECURITY.md](SECURITY.md) 私密报告。
