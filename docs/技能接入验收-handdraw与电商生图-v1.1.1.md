# 手绘风格与电商生图 Skill 接入验收

## 基本信息

- 日期：2026-09-10
- 技能中心版本：`1.1.1`
- 中心源：`~/.agents/skills`
- 接入客户端：Codex、Claude Code、Hermes、Gemini CLI、Cursor、ZCode
- 当前能力资产：186 项
- 当前真实截图/案例资产：50 项技能

## 1. 手绘风格提示词

- Skill ID：`handdraw-style-prompter`
- 上游：https://github.com/yang0/handraw-style
- 固定提交：`58dee6151874c6fc381e6a0d97430f1c275c1696`
- 上游许可证：未发现 `LICENSE` 或 `COPYING`，仅限本机个人学习使用，不公开再分发上游图片与风格表。
- 本机体积：102,537,113 bytes
- 文件数：344
- 目录哈希：`95313e7e8ddf37586b298464e908d3646ba44239326fe4287d998115be732e3e`
- 能力内容：261 个编号风格、19 张风格拼图、325 个参考图。

### 上游原始问题

- `resolve_reference.py` 和 `validate_library.py` 引用了仓库中不存在的 `style_asset_paths.py` 与 `contact_sheet_registry.py`。
- `SKILL.md` 将画廊和图片根目录硬编码为 Windows `E:\handraw-style`，不能直接在当前 Mac 使用。
- 官方安装器只下载 `handdraw-style-prompter/` 子目录，不包含仓库根目录的风格表与图片，参考图模式无法工作。

### 本地适配

- 补齐两个缺失模块。
- 所有路径改为相对 Skill 根目录解析。
- 将风格表、画廊和图片整理为单一自包含 Skill。
- 将入口说明中文化，并把 UI 名称固定为“手绘·风格·提示词”。

### 验证

- `quick_validate.py`：通过。
- `validate_library.py`：通过，输出 `PASS: 261 styles, gallery coverage, prompt contract, and invalid-number guard.`
- 真实最小提示词调用：`041 + 秋天的第一杯奶茶` 成功输出中英文提示词。
- 未知模型参考图解析：成功回退到 `images/individual/001-200/041.png`。
- 技能中心回读：图像生成、方策分 100、状态可用、6 个客户端已连接、能力预览 `4 / 325`。

## 2. 电商图片生成与改图

- Skill ID：`gpt-image-2-5-ecommerce`
- 上游：https://github.com/EvoLinkAI/gpt-image-2.5-for-e-commerce
- 固定提交：`963b1f40bfbe5ff81f0c9684587face6a500bc9a`
- 上游许可证：Creative Commons Attribution 4.0 International。
- 上游类型：案例与提示词资料库，没有 `SKILL.md`，不能直接称为已安装 Skill。
- 适配后体积：6,963,175 bytes
- 文件数：11
- 目录哈希：`995c0fb3e5e15adea8fc5019b736634f8aef86f4d85f482135868b251f7db209`

### 本地适配

- 新建包参谋中文 Skill 入口和 OpenAI UI 元数据。
- 保留完整中文提示词手册、3 个结构化精选案例和许可证。
- 新增本地模板检索脚本，不依赖网络与 API Key。
- 从约 995 MB 上游仓库中仅选取 4 张不同用途的作者真实案例用于能力预览，避免全量素材重复安装。
- 加入商品一致性、Logo/标签、虚假功效、认证、参数和多语言文字核对边界。

### 验证

- `quick_validate.py`：通过。
- Python 语法检查：通过。
- `试穿` 检索：正确返回“服装试穿图套图”。
- `背景` 检索：正确返回“服装销售背景概念”和“纯白背景产品精修”。
- 技能中心回读：图像生成、方策分 100、状态可用、6 个客户端已连接、能力预览 `4 / 4`。
- 未做真实商品生图：本轮没有用户商品原图，不能用无关素材冒充“商品一致性”测试；提示词选择与约束链路已验证。

## 技能中心与安装包验证

- `npm run check`：通过。
- 前端测试：4 项通过。
- 热门能力情报测试：4 项通过。
- Python 审计测试：3 项通过。
- Rust 测试：8 项通过。
- 桌面 App 真实启动与视觉回读：通过。
- 两项技能均显示专属中文名称、主要用途、案例数量与 2×2 真实预览。
- DMG `hdiutil verify`：通过。

## 已知边界

- 全局只读审计仍为 `healthy: false`：原因是 ZCode 中既有 16 条断链及中心源既有 16 项结构问题；两项新技能自身 `issues: []`，Codex、Claude Code、Hermes、Gemini CLI、Cursor 的断链数均为 0。
- OpenCode 和 Windsurf 当前未检测到，因此没有为它们创建入口。
- v1.1.1 使用本地 ad-hoc 签名，未进行 Apple 公证。

## 安装包

- 文件：`src-tauri/target/release/bundle/dmg/包参谋 AI 技能中心_1.1.1_aarch64.dmg`
- 大小：3,117,435 bytes
- SHA-256：`2e2a0aa6581d44cde983fcf060c42bcab2d9103180f215d07556a47b87e651ff`

## 开源边界

包参谋公开 GitHub 仓库只提交技能中心适配逻辑、中文识别规则与本验收记录，不提交 `handraw-style` 无明确许可的图片/风格表，也不提交电商仓库的案例图片副本。两套实际 Skill 只保存在本机共享中心源。
