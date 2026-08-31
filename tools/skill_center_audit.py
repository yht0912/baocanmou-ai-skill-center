#!/usr/bin/env python3
"""包参谋 AI 技能中心只读审计器。

盘点共享技能源及各 AI 工具入口，不会新建、删除、修复或替换任何文件。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


TOOL_PATHS = {
    "Codex": ".codex/skills",
    "Claude Code": ".claude/skills",
    "Hermes": ".hermes/skills",
    "Gemini CLI": ".gemini/skills",
    "Cursor": ".cursor/skills",
    "ZCode": ".zcode/skills",
    "OpenCode": ".config/opencode/skills",
}
FRONTMATTER = re.compile(r"\A---\s*\n(?P<body>.*?)\n---(?:\s*\n|\Z)", re.DOTALL)
FIELD = re.compile(r"^(?P<key>[A-Za-z0-9_-]+):\s*(?P<value>.*)$")


@dataclass
class SkillResult:
    name: str
    path: str
    declared_name: str | None
    description: str | None
    file_count: int
    byte_count: int
    sha256: str
    git_origin: str | None
    git_revision: str | None
    issues: list[str]


@dataclass
class ToolResult:
    name: str
    path: str
    exists: bool
    entry_count: int
    symlink_count: int
    broken_symlink_count: int
    central_link_count: int


def parse_frontmatter(text: str) -> dict[str, str]:
    match = FRONTMATTER.search(text)
    if not match:
        return {}
    fields: dict[str, str] = {}
    for line in match.group("body").splitlines():
        found = FIELD.match(line)
        if not found:
            continue
        value = found.group("value").strip().strip("\"'")
        fields[found.group("key")] = value
    return fields


def visible_files(root: Path) -> Iterable[Path]:
    for current, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = sorted(
            name for name in dirnames if name not in {".git", "node_modules", "__pycache__"}
        )
        for filename in sorted(filenames):
            path = Path(current) / filename
            if not path.is_symlink() and path.is_file():
                yield path


def digest_tree(root: Path) -> tuple[int, int, str]:
    digest = hashlib.sha256()
    files = list(visible_files(root))
    total = 0
    for path in files:
        relative = path.relative_to(root).as_posix().encode("utf-8")
        content = path.read_bytes()
        total += len(content)
        digest.update(len(relative).to_bytes(4, "big"))
        digest.update(relative)
        digest.update(len(content).to_bytes(8, "big"))
        digest.update(content)
    return len(files), total, digest.hexdigest()


def git_value(root: Path, *args: str) -> str | None:
    if not (root / ".git").exists():
        return None
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        check=False,
        capture_output=True,
        text=True,
        timeout=5,
    )
    value = result.stdout.strip()
    return value if result.returncode == 0 and value else None


def inspect_skill(path: Path) -> SkillResult:
    issues: list[str] = []
    skill_file = path / "SKILL.md"
    declared_name: str | None = None
    description: str | None = None
    if not skill_file.is_file():
        issues.append("缺少 SKILL.md")
    else:
        try:
            fields = parse_frontmatter(skill_file.read_text(encoding="utf-8"))
            declared_name = fields.get("name")
            description = fields.get("description")
            if not declared_name:
                issues.append("缺少 frontmatter.name")
            elif declared_name != path.name:
                issues.append(f"目录名与 name 不一致：{declared_name}")
            if not description:
                issues.append("缺少 frontmatter.description")
        except UnicodeDecodeError:
            issues.append("SKILL.md 不是 UTF-8")
    count, size, sha256 = digest_tree(path)
    return SkillResult(
        name=path.name,
        path=str(path),
        declared_name=declared_name,
        description=description,
        file_count=count,
        byte_count=size,
        sha256=sha256,
        git_origin=git_value(path, "remote", "get-url", "origin"),
        git_revision=git_value(path, "rev-parse", "HEAD"),
        issues=issues,
    )


def resolve_existing(path: Path) -> Path | None:
    try:
        return path.resolve(strict=True)
    except (FileNotFoundError, OSError, RuntimeError):
        return None


def inspect_tool(name: str, path: Path, central: Path) -> ToolResult:
    if not path.is_dir():
        return ToolResult(name, str(path), False, 0, 0, 0, 0)
    entries = [entry for entry in path.iterdir() if not entry.name.startswith(".")]
    symlinks = [entry for entry in entries if entry.is_symlink()]
    broken = [entry for entry in symlinks if resolve_existing(entry) is None]
    central_resolved = resolve_existing(central) or central.absolute()
    linked = 0
    for entry in symlinks:
        target = resolve_existing(entry)
        if target is not None and target.parent == central_resolved:
            linked += 1
    return ToolResult(name, str(path), True, len(entries), len(symlinks), len(broken), linked)


def build_report(central: Path, home: Path) -> dict[str, object]:
    central = central.expanduser().absolute()
    skills = []
    if central.is_dir():
        skills = [
            inspect_skill(entry)
            for entry in sorted(central.iterdir(), key=lambda item: item.name.casefold())
            if entry.is_dir() and not entry.name.startswith(".")
        ]
    tools = [
        inspect_tool(name, home / relative, central)
        for name, relative in TOOL_PATHS.items()
    ]
    issue_count = sum(len(skill.issues) for skill in skills)
    broken_count = sum(tool.broken_symlink_count for tool in tools)
    return {
        "schema_version": 1,
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "read_only": True,
        "central": {
            "path": str(central),
            "exists": central.is_dir(),
            "skill_count": len(skills),
            "issue_count": issue_count,
        },
        "skills": [asdict(skill) for skill in skills],
        "tools": [asdict(tool) for tool in tools],
        "summary": {
            "skill_count": len(skills),
            "skill_issue_count": issue_count,
            "broken_symlink_count": broken_count,
            "healthy": central.is_dir() and issue_count == 0 and broken_count == 0,
        },
    }


def markdown_report(report: dict[str, object]) -> str:
    central = report["central"]
    summary = report["summary"]
    assert isinstance(central, dict) and isinstance(summary, dict)
    lines = [
        "# AI 技能库只读审计报告",
        "",
        f"- 生成时间：{report['generated_at']}",
        f"- 中心技能源：`{central['path']}`",
        f"- 中心技能数：{summary['skill_count']}",
        f"- 技能规范问题：{summary['skill_issue_count']}",
        f"- 断链：{summary['broken_symlink_count']}",
        f"- 总体状态：{'\u5065\u5eb7' if summary['healthy'] else '\u9700\u8981\u5904\u7406'}",
        "",
        "## AI 工具入口",
        "",
        "| 工具 | 路径 | 入口数 | 软链接 | 指向中心源 | 断链 |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for tool in report["tools"]:
        assert isinstance(tool, dict)
        lines.append(
            f"| {tool['name']} | `{tool['path']}` | {tool['entry_count']} | "
            f"{tool['symlink_count']} | {tool['central_link_count']} | {tool['broken_symlink_count']} |"
        )
    lines.extend(["", "## 需要处理的技能", ""])
    issues_found = False
    for skill in report["skills"]:
        assert isinstance(skill, dict)
        if skill["issues"]:
            issues_found = True
            lines.append(f"- `{skill['name']}`：{'\uff1b'.join(skill['issues'])}")
    if not issues_found:
        lines.append("- 未发现技能文件夹规范问题。")
    lines.extend(["", "> 本报告由只读审计器生成，没有修改任何技能或软链接。", ""])
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="只读审计共享 AI 技能源及各工具入口")
    parser.add_argument("--central", type=Path, default=Path("~/.agents/skills"))
    parser.add_argument("--home", type=Path, default=Path.home())
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--strict", action="store_true", help="发现问题时返回非 0")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_report(args.central, args.home.expanduser().absolute())
    rendered = (
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        if args.format == "json"
        else markdown_report(report)
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 2 if args.strict and not report["summary"]["healthy"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
