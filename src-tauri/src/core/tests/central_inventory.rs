use std::fs;

use tempfile::tempdir;

use super::*;

fn write_skill(path: &Path, name: &str) {
    fs::create_dir_all(path).unwrap();
    fs::write(
        path.join("SKILL.md"),
        format!("---\nname: {name}\ndescription: 测试技能\n---\n\n# {name}\n"),
    )
    .unwrap();
}

#[test]
fn registers_valid_central_skills_without_copying_files() {
    let temp = tempdir().unwrap();
    let home = temp.path().join("home");
    let central = home.join(".agents/skills");
    write_skill(&central.join("alpha"), "alpha");
    fs::create_dir_all(central.join("invalid")).unwrap();

    let store = SkillStore::new(temp.path().join("inventory.db"));
    store.ensure_schema().unwrap();
    let result = register_existing_central_skills(&store, &central, &home).unwrap();

    assert_eq!(result.scanned, 2);
    assert_eq!(result.registered, 1);
    assert_eq!(result.skipped_invalid, 1);
    let skills = store.list_skills().unwrap();
    assert_eq!(skills.len(), 1);
    assert_eq!(skills[0].name, "alpha");
    assert_eq!(skills[0].source_type, "existing");
    assert!(central.join("alpha/SKILL.md").is_file());
}

#[test]
fn repeated_registration_preserves_existing_source_metadata() {
    let temp = tempdir().unwrap();
    let home = temp.path().join("home");
    let central = home.join(".agents/skills");
    write_skill(&central.join("alpha"), "alpha");
    let store = SkillStore::new(temp.path().join("inventory.db"));
    store.ensure_schema().unwrap();

    let first = register_existing_central_skills(&store, &central, &home).unwrap();
    let second = register_existing_central_skills(&store, &central, &home).unwrap();

    assert_eq!(first.registered, 1);
    assert_eq!(second.registered, 0);
    assert_eq!(store.list_skills().unwrap().len(), 1);
}

#[cfg(unix)]
#[test]
fn adopts_existing_codex_and_claude_links_as_targets() {
    use std::os::unix::fs::symlink;

    let temp = tempdir().unwrap();
    let home = temp.path().join("home");
    let central = home.join(".agents/skills");
    let skill = central.join("alpha");
    write_skill(&skill, "alpha");
    fs::create_dir_all(home.join(".codex/skills")).unwrap();
    fs::create_dir_all(home.join(".claude/skills")).unwrap();
    symlink(&skill, home.join(".codex/skills/alpha")).unwrap();
    symlink(&skill, home.join(".claude/skills/alpha")).unwrap();

    let store = SkillStore::new(temp.path().join("inventory.db"));
    store.ensure_schema().unwrap();
    let result = register_existing_central_skills(&store, &central, &home).unwrap();

    assert_eq!(result.linked_targets, 2);
    let record = &store.list_skills().unwrap()[0];
    let targets = store.list_skill_targets(&record.id).unwrap();
    assert_eq!(targets.len(), 2);
    assert!(targets.iter().any(|target| target.tool == "codex"));
    assert!(targets.iter().any(|target| target.tool == "claude_code"));
}
