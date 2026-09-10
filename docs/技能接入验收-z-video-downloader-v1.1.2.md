# 视频下载器 Skill 接入验收

## 基本信息

- 日期：2026-09-10
- 技能中心版本：`1.1.2`
- Skill ID：`z-video-downloader`
- 中文名称：视频·下载·归档
- 上游：<https://github.com/tjxj/z-skills/tree/main/z-video-downloader>
- 固定提交：`50539dc647bedb47aca10ed35f27ffc5d3addfe2`
- 中心源：`~/.agents/skills/z-video-downloader`
- 接入客户端：Codex、Claude Code、Hermes、Gemini CLI、Cursor、ZCode

## 上游审计

- 上游是标准 Skill，包含 `SKILL.md`、Python 脚本、23 项单元测试和评估样例。
- 仓库根目录及该 Skill 目录未发现 `LICENSE`、`COPYING` 或等价许可文件，因此不公开再分发其脚本与文档。
- 上游写死 `/Users/zz/miniconda3/bin/python3` 和 `/Users/zz/miniconda3/bin/yt-dlp`，不能直接作为当前 Mac 的稳定入口。
- 上游默认把微信视频号分享链接交给 `sph.litao.workers.dev`，并可能把 YouTube 视频标识交给 Invidious 实例；这属于第三方网络披露，不能静默启用。

## 本机适配

- 改为使用当前 `python3`，并从 `PATH` 查找 `yt-dlp` 和 `ffmpeg`。
- 新增 `BAOCANMOU_VIDEO_ROOT` 输出根覆盖，同时保留上游变量兼容。
- 新增 `--allow-third-party-resolver`；没有明确参数时，微信视频号解析与 YouTube Invidious 回退均保持关闭。
- 增加中文 UI 元数据、主要用途、版权与访问权限边界。
- 默认仍为单视频、最高 1080p、单文件 2000 MB，并保留播放列表确认、断点续传、字幕、封面和历史去重能力。

## 验证结果

- 官方安装器临时安装：通过。
- `quick_validate.py`：通过。
- Python 语法检查：通过。
- 上游测试：19 项不需要网络的测试通过；4 项回环测试在沙箱内因禁止监听端口报错，不是代码断言失败。
- 适配后正式测试：24 / 24 通过，包括直链下载、断点续传、清单去重、Cookie 优先级、Invidious 范围下载和第三方默认关闭。
- 正式安装目录真实调用：成功下载本机生成的 H.264 测试视频，成功 1、失败 0、跳过 0。
- 下载前后 SHA-256 一致：`8e1f6ab3cef037e8d1728fb44ef4e3dbf1e7c5ed5b0fc2a3f40bc34c9b6efd02`。
- `ffprobe`：H.264、320×180、1.000 秒、2302 bytes，可解码。
- 第三方默认关闭验证：无授权参数时，视频号入口直接返回 `third-party-resolver-disabled`，未调用解析服务。

## 技能中心回读

- 安装前能力资产：187 项。
- 安装后能力资产：188 项。
- 本技能文件数：7。
- 本技能体积：74,105 bytes。
- 本技能目录哈希：`6b8873ba646fea3d95470bfb4b26631d4f2a8c85cf5ad15f63704ecd65b0ee3f`。
- 本技能结构问题：0。
- 六个客户端入口均解析到共享中心源。

## 已知边界

- 本轮没有下载任何第三方平台的真实视频，以免把“测试安装”扩大为下载他人内容；真实调用使用本机生成、可自由验证的 1 秒测试视频。
- 平台能否下载仍受目标平台规则、网络状态、登录权限和 `yt-dlp` 兼容性影响。
- 当前全局审计仍有既存的 16 条 ZCode 断链与 16 项结构问题，本技能自身 `issues: []`。
- OpenCode 与 Windsurf 当前未检测到，因此没有创建入口。

## 安装包

- 文件：`src-tauri/target/release/bundle/dmg/包参谋 AI 技能中心_1.1.2_aarch64.dmg`
- 大小：3,120,077 bytes。
- SHA-256：`5d4026c2ea44427ea73dabf370ba16ae12c7107e84547449f1b82a1494fd3d1a`。
- `hdiutil verify`：通过。
- 使用本地 ad-hoc 签名，未进行 Apple 公证。

## 开源边界

包参谋公开 GitHub 仓库只提交技能中心的原创中文识别、用途说明、安全决策和本验收记录，不提交上游未明确许可的 Skill 文件。
