---
name: easel-content-workbench
description: "当用户需要策划、制作、检查或准备发布社交媒体内容时，调用本技能连接本机 Easel 工作台，完成选题、画像、内容生产、媒体处理和效果归因。默认只做本地生成与预览；启动网关、登录平台、上传或真实发布必须另行确认。"
metadata:
  author: BaoCanMou
  version: "1.0.0"
  upstream: https://github.com/ZJU-REAL/Easel
---

# 社媒内容工作台

把 Easel 作为独立工具使用，把“源码存在、环境就绪、内容生成、预览完成、平台发布、效果验证”分开报告。不要因为仓库可克隆或 CLI 能启动，就宣称整套生产流程可用。

## 何时使用

- 用户要做小红书、公众号、B 站、抖音、知乎等平台的内容研究、策划、制作或复盘。
- 用户明确点名 Easel，或需要在它的内置技能中选择最合适的能力。
- 用户需要把人物画像、选题、图文/音视频生产与数据归因串成一条可检查流程。

## 安装位置与预检

先从项目规则、`EASEL_ROOT` 或用户给定路径定位 Easel，不臆造路径。预检命令应在工具根目录执行：

```bash
.venv/bin/easel doctor
.venv/bin/python scripts/validate_skills.py
```

诊断失败时逐项说明缺失的依赖、API Key、浏览器、网关或技能同步状态。不得用“安装成功”掩盖未满足项。

## 工作原则

1. 先确认目标平台、受众、内容类型、素材权利和交付格式，再从 `skills/openclaw/` 中选最小能力集合。
2. 默认只读取本地素材、生成草稿和预览。不得自行读取浏览器登录态、密钥或用户数据。
3. 不自动执行一键 setup、网关启动、账号登录、技能全量同步或真实平台发布。
4. 发布是单独授权动作。发布前展示最终标题、正文、媒体、账号、平台与发布时间，并取得用户明确确认。
5. 出现验证码、风控或账号异常时停止，不绕过平台验证。
6. 正式交付遵循当前项目的输出和归档规则。

## 验收

- 运行上游技能规范校验，记录通过数量。
- 优先运行不触发网络、登录或发布的单元测试。
- 确认前端构建产物和后端路由可加载；若服务默认绑定非回环地址，不擅自启动。
- 只有 API、网关、浏览器和目标账号均验证后，才能标记“生产就绪”。

## 输出

用中文给出采用的内部技能、输入材料、生成结果、检查证据、未满足项与下一步。涉及发布时明确写“未发布 / 已获授权并发布 / 线上回读已确认”的真实状态。

## English summary

Use a local Easel installation to plan, produce, preview, and evaluate social content. Keep local generation separate from account login and real publishing; publishing always requires explicit approval and a final preview.
