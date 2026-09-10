---
name: freepep-catalog-auditor
description: "当用户需要查询或核验人民教育出版社教材目录、学段、年级、学科、册次与官方阅读入口时，调用本技能读取本机 FreePEP 目录缓存并输出中文清单。仅做目录与公开入口核验，不执行验证码绕过、批量抓页或教材 PDF 再分发。"
metadata:
  author: BaoCanMou
  version: "1.0.0"
  upstream: https://github.com/siknet/FreePEP
---

# 人教教材目录核验

本技能只使用 FreePEP 的本地教材元数据与公开官方入口，帮助用户确认“有哪些教材”和“目录是否可访问”。程序采用 MIT 许可证，不代表教材内容可以自由下载、复制或再分发。

## 何时使用

- 用户要查询某学制、年级、学科或册次有哪些人教教材。
- 用户要核对本地目录数量、唯一 ID、标题字段或官方阅读入口。
- 用户点名 FreePEP，但实际需求可以通过目录和官方在线阅读完成。

## 安装位置与预检

先从项目规则、`FREEPEP_ROOT` 或用户给定路径定位工具，不臆造路径。在工具根目录执行：

```bash
.venv/bin/python -m compileall -q .
.venv/bin/python cli.py --help
```

## 允许的工作

1. 读取 `pep_catalog.json`，按 `xd`、`xk`、`nj`、`cc` 和关键词筛选。
2. 校验记录数量、唯一 ID、标题、学科、学制及 `book.pep.com.cn` 官方入口格式。
3. 以低并发、普通浏览器标识只读检查少量用户指定入口是否返回成功状态。
4. 输出官方在线阅读入口和目录差异，注明目录快照日期。

## 禁止的工作

- 不调用或改写自动滑块、WAF 绕过、验证码破解逻辑。
- 不批量抓取教材页图片，不合成或分发教材 PDF。
- 不因代码许可证为 MIT 就声称教材内容也是开放许可。
- 不把“入口 HTTP 200”写成“教材所有页面完整可读”或“版权允许下载”。

## 验收输出

至少写明目录总数、筛选条件、匹配数量、按学制/学科统计、字段校验结果、官方入口连通结果、未测试范围与版权边界。用户说“小学四年级上册”时，默认分别列出常规六三学制、五四学制与特殊教育，不把它们混成一本教材体系。

## English summary

Audit a local FreePEP catalog and official PEP reading entry points. This adapter is catalog-only: it does not bypass WAF challenges, scrape textbook pages, build PDFs, or redistribute textbook content.
