---
name: omnivoice-tts
description: "当用户需要多语种文字转语音、授权声音克隆或中英文声音风格设计时，调用本技能连接本机 OmniVoice，检查模型与设备后生成并验收音频。禁止未经授权模仿真人、冒充身份、诈骗或制作误导性语音。"
metadata:
  author: BaoCanMou
  version: "1.0.0"
  upstream: https://github.com/k2-fsa/OmniVoice
---

# 多语种语音合成

把 OmniVoice 转成可审计的语音任务流程。代码安装、依赖安装、模型下载、设备可用、音频生成与听感验收是六种不同状态，必须分别说明。

## 何时使用

- 用户需要把文案生成中文、英文或其他语言语音。
- 用户提供自己拥有权利的参考音频并明确要求声音克隆。
- 用户需要在中英文范围内设计年龄、性别、音高、口音或方言等声音风格。

## 安装位置与预检

先从项目规则、`OMNIVOICE_ROOT` 或用户给定路径定位工具，不臆造路径。在工具根目录执行：

```bash
.venv/bin/python -c "import torch, torchaudio, transformers, omnivoice; print(torch.__version__)"
.venv/bin/omnivoice-infer --help
```

如果模型 `k2-fsa/OmniVoice` 尚未下载，先说明额外下载与磁盘成本。不得把模型页面可访问写成模型已可推理。

## 权利与安全

1. 声音克隆只接受用户本人、已获明确授权或权利清晰的声音。来源不清时改用随机声音或声音设计。
2. 禁止冒充真人、制造虚假声明、绕过声纹验证、诈骗、骚扰或其他误导性用途。
3. 不把参考音频上传到非必要服务；不得写入公开仓库或长期知识库。
4. 参考音频建议 3–10 秒、干净单人声；跨语言克隆可能保留参考语言口音，需提前说明。

## 生成与验收

1. 确认文本、语言、声音模式、输出格式与用途。
2. 检查 CPU、MPS 或 CUDA 的真实可用状态，并选择实际可用设备。
3. 先做一句短文本的最小推理，再进行长文本或批量任务。
4. 生成后验证可解码、采样率、时长、声道和非静音区间，并实际试听关键片段。
5. 报告模型版本、设备、参数、输出路径和已知限制；未试听不得写“听感自然”。

## English summary

Use a local OmniVoice installation for multilingual TTS, consented voice cloning, and Chinese/English voice design. Verify dependencies, model weights, device support, audio decoding, and listening quality separately. Never impersonate a person without authorization.
