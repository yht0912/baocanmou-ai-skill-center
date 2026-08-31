use std::collections::HashMap;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use uuid::Uuid;

use super::content_hash::hash_dir;
use super::installer::parse_skill_md;
use super::skill_store::{SkillRecord, SkillStore, SkillTargetRecord};
use super::tool_adapters::default_tool_adapters;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CentralInventoryResult {
    pub scanned: usize,
    pub registered: usize,
    pub skipped_invalid: usize,
    pub linked_targets: usize,
}

pub fn register_existing_central_skills(
    store: &SkillStore,
    central_root: &Path,
    home_root: &Path,
) -> Result<CentralInventoryResult> {
    if !central_root.is_dir() {
        return Ok(CentralInventoryResult::default());
    }

    let mut result = CentralInventoryResult::default();
    let mut existing_by_path = store
        .list_skills()?
        .into_iter()
        .map(|skill| (PathBuf::from(&skill.central_path), skill))
        .collect::<HashMap<_, _>>();

    let mut entries = std::fs::read_dir(central_root)
        .with_context(|| format!("read central skills directory {:?}", central_root))?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        let central_path = entry.path();
        if !central_path.is_dir() {
            continue;
        }
        let folder_name = entry.file_name().to_string_lossy().to_string();
        if folder_name.starts_with('.') {
            continue;
        }
        result.scanned += 1;

        let skill_md = central_path.join("SKILL.md");
        let Some((frontmatter_name, description)) = parse_skill_md(&skill_md) else {
            result.skipped_invalid += 1;
            continue;
        };

        let skill = if let Some(existing) = existing_by_path.get(&central_path) {
            existing.clone()
        } else {
            let now = now_ms();
            let (source_type, source_ref, source_revision) =
                detect_direct_git_source(&central_path);
            let skill = SkillRecord {
                id: Uuid::new_v4().to_string(),
                name: if frontmatter_name.trim().is_empty() {
                    folder_name.clone()
                } else {
                    frontmatter_name
                },
                description,
                source_type,
                source_ref,
                source_subpath: None,
                source_revision,
                central_path: central_path.to_string_lossy().to_string(),
                content_hash: hash_dir(&central_path).ok(),
                created_at: now,
                updated_at: now,
                last_sync_at: None,
                last_seen_at: now,
                enabled: true,
                status: "ok".to_string(),
            };
            store.upsert_skill(&skill)?;
            existing_by_path.insert(central_path.clone(), skill.clone());
            result.registered += 1;
            skill
        };

        result.linked_targets +=
            register_matching_link_targets(store, &skill, central_root, home_root)?;
    }

    Ok(result)
}

fn detect_direct_git_source(path: &Path) -> (String, Option<String>, Option<String>) {
    let Ok(repo) = git2::Repository::open(path) else {
        return ("existing".to_string(), None, None);
    };
    let source_ref = repo
        .find_remote("origin")
        .ok()
        .and_then(|remote| remote.url().map(ToOwned::to_owned));
    let source_revision = repo
        .head()
        .ok()
        .and_then(|head| head.target())
        .map(|oid| oid.to_string());
    let source_type = if source_ref.is_some() {
        "git".to_string()
    } else {
        "existing".to_string()
    };
    (source_type, source_ref, source_revision)
}

fn register_matching_link_targets(
    store: &SkillStore,
    skill: &SkillRecord,
    central_root: &Path,
    home_root: &Path,
) -> Result<usize> {
    let source = PathBuf::from(&skill.central_path);
    let source_canonical = std::fs::canonicalize(&source).ok();
    let central_canonical = std::fs::canonicalize(central_root).ok();
    let target_name = source
        .file_name()
        .context("central skill path has no folder name")?;
    let mut registered = 0;

    for adapter in default_tool_adapters() {
        let target_root = home_root.join(adapter.relative_skills_dir);
        if target_root == central_root
            || central_canonical.as_ref().is_some_and(|central| {
                std::fs::canonicalize(&target_root).ok().as_ref() == Some(central)
            })
        {
            continue;
        }
        let target = target_root.join(target_name);
        let Ok(meta) = std::fs::symlink_metadata(&target) else {
            continue;
        };
        if !meta.file_type().is_symlink() {
            continue;
        }
        let target_canonical = std::fs::canonicalize(&target).ok();
        if source_canonical.is_none() || target_canonical != source_canonical {
            continue;
        }

        let target_record = SkillTargetRecord {
            id: Uuid::new_v4().to_string(),
            skill_id: skill.id.clone(),
            tool: adapter.id.as_key().to_string(),
            scope: "global".to_string(),
            project_path: None,
            target_path: target.to_string_lossy().to_string(),
            mode: "symlink".to_string(),
            status: "ok".to_string(),
            last_error: None,
            synced_at: Some(now_ms()),
        };
        store.upsert_skill_target(&target_record)?;
        registered += 1;
    }

    Ok(registered)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg(test)]
#[path = "tests/central_inventory.rs"]
mod tests;
