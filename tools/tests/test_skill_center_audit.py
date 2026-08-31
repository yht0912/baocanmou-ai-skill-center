import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "skill_center_audit.py"
SPEC = importlib.util.spec_from_file_location("skill_center_audit", SCRIPT)
assert SPEC and SPEC.loader
AUDIT = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = AUDIT
SPEC.loader.exec_module(AUDIT)


class SkillCenterAuditTests(unittest.TestCase):
    def test_reports_valid_skill_and_tool_links(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            central = home / ".agents/skills"
            skill = central / "demo"
            skill.mkdir(parents=True)
            (skill / "SKILL.md").write_text(
                "---\nname: demo\ndescription: 演示技能\n---\n\n# 演示\n",
                encoding="utf-8",
            )
            target = home / ".codex/skills"
            target.mkdir(parents=True)
            (target / "demo").symlink_to(skill, target_is_directory=True)

            report = AUDIT.build_report(central, home)

            self.assertEqual(report["summary"]["skill_count"], 1)
            self.assertEqual(report["summary"]["skill_issue_count"], 0)
            codex = next(item for item in report["tools"] if item["name"] == "Codex")
            self.assertEqual(codex["central_link_count"], 1)
            self.assertEqual(codex["broken_symlink_count"], 0)

    def test_reports_invalid_skill_and_broken_link(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            central = home / ".agents/skills"
            (central / "invalid").mkdir(parents=True)
            target = home / ".claude/skills"
            target.mkdir(parents=True)
            (target / "missing").symlink_to(central / "missing", target_is_directory=True)

            report = AUDIT.build_report(central, home)

            self.assertEqual(report["summary"]["skill_issue_count"], 1)
            self.assertEqual(report["summary"]["broken_symlink_count"], 1)
            self.assertFalse(report["summary"]["healthy"])

    def test_markdown_is_chinese_and_marks_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            central = home / ".agents/skills"
            central.mkdir(parents=True)

            rendered = AUDIT.markdown_report(AUDIT.build_report(central, home))

            self.assertIn("AI 技能库只读审计报告", rendered)
            self.assertIn("没有修改任何技能或软链接", rendered)


if __name__ == "__main__":
    unittest.main()
