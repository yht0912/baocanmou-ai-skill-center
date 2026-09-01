use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

const SKILL_FILE: &str = "SKILL.md";
const COPY_MARKER: &str = ".baocanmou-managed-copy";
const MAX_SKILL_BYTES: u64 = 512 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CenterSnapshot {
    pub center_path: String,
    pub generated_at: u64,
    pub skills: Vec<SkillAsset>,
    pub tools: Vec<ToolStatus>,
    pub summary: SnapshotSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    pub asset_count: usize,
    pub ready_count: usize,
    pub attention_count: usize,
    pub connection_count: usize,
    pub chinese_ready_count: usize,
    pub screenshot_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAsset {
    pub id: String,
    pub name_zh: String,
    pub name_en: String,
    pub summary_zh: String,
    pub summary_en: String,
    pub purpose_zh: String,
    pub purpose_en: String,
    pub features_zh: Vec<String>,
    pub features_en: Vec<String>,
    pub category: String,
    pub path: String,
    pub score: u8,
    pub status: String,
    pub risk_level: String,
    pub risk_flags: Vec<String>,
    pub file_count: usize,
    pub content_hash: String,
    pub modified_at: u64,
    pub translation_mode: String,
    pub preview_kind: String,
    pub connections: Vec<SkillConnection>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConnection {
    pub tool_id: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub id: String,
    pub name: String,
    pub detected: bool,
    pub skills_path: String,
    pub linked_count: usize,
    pub conflict_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillContent {
    pub skill_id: String,
    pub path: String,
    pub markdown: String,
    pub preview_data_url: Option<String>,
    pub preview_kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationInput {
    pub skill_id: String,
    pub name_zh: String,
    pub summary_zh: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct TranslationRecord {
    name_zh: String,
    summary_zh: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct TranslationStore {
    translations: BTreeMap<String, TranslationRecord>,
}

#[derive(Debug, Clone)]
struct ToolSpec {
    id: &'static str,
    name: &'static str,
    root: &'static str,
    skills_dir: &'static str,
}

fn tool_specs() -> [ToolSpec; 8] {
    [
        ToolSpec {
            id: "codex",
            name: "Codex",
            root: ".codex",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "claude",
            name: "Claude Code",
            root: ".claude",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "gemini",
            name: "Gemini CLI",
            root: ".gemini",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "cursor",
            name: "Cursor",
            root: ".cursor",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "hermes",
            name: "Hermes",
            root: ".hermes",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "zcode",
            name: "ZCode",
            root: ".zcode",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "opencode",
            name: "OpenCode",
            root: ".config/opencode",
            skills_dir: "skills",
        },
        ToolSpec {
            id: "windsurf",
            name: "Windsurf",
            root: ".windsurf",
            skills_dir: "skills",
        },
    ]
}

pub fn scan() -> io::Result<CenterSnapshot> {
    let center = center_root()?;
    fs::create_dir_all(&center)?;
    let home = home_root()?;
    let translations = load_translations().unwrap_or_default();
    let mut skills = Vec::new();

    for entry in sorted_entries(&center)? {
        let path = entry.path();
        let file_type = entry.file_type()?;
        if (!file_type.is_dir() && !file_type.is_symlink()) || is_hidden(&entry.file_name()) {
            continue;
        }
        let Some(id) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if validate_id(&id).is_err() {
            continue;
        }
        skills.push(inspect_skill(&center, &home, &id, &path, &translations));
    }

    skills.sort_by(|a, b| a.name_zh.cmp(&b.name_zh).then_with(|| a.id.cmp(&b.id)));
    let tools = inspect_tools(&home, &center, &skills);
    let connection_count = skills
        .iter()
        .flat_map(|skill| &skill.connections)
        .filter(|connection| connection.mode == "link" || connection.mode == "copy")
        .count();
    let summary = SnapshotSummary {
        asset_count: skills.len(),
        ready_count: skills
            .iter()
            .filter(|skill| skill.status == "ready")
            .count(),
        attention_count: skills
            .iter()
            .filter(|skill| skill.status != "ready")
            .count(),
        connection_count,
        chinese_ready_count: skills
            .iter()
            .filter(|skill| skill.translation_mode != "pending")
            .count(),
        screenshot_count: skills
            .iter()
            .filter(|skill| skill.preview_kind == "screenshot")
            .count(),
    };

    Ok(CenterSnapshot {
        center_path: display_path(&center),
        generated_at: now_seconds(),
        skills,
        tools,
        summary,
    })
}

pub fn read_skill(skill_id: &str) -> io::Result<SkillContent> {
    validate_id(skill_id)?;
    let center = center_root()?;
    let file = center.join(skill_id).join(SKILL_FILE);
    ensure_skill_path(&center, &file)?;
    let metadata = fs::metadata(&file)?;
    if metadata.len() > MAX_SKILL_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "SKILL.md exceeds the 512 KB safety limit",
        ));
    }
    let preview_data_url = read_preview_data_url(&center.join(skill_id))?;
    let preview_kind = if preview_data_url.is_some() {
        "screenshot"
    } else {
        "generated"
    };
    Ok(SkillContent {
        skill_id: skill_id.to_owned(),
        path: display_path(&file),
        markdown: fs::read_to_string(&file)?,
        preview_data_url,
        preview_kind: preview_kind.to_owned(),
    })
}

pub fn save_translation(input: TranslationInput) -> io::Result<()> {
    validate_id(&input.skill_id)?;
    let name = input.name_zh.trim();
    let summary = input.summary_zh.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Chinese name must contain 1 to 80 characters",
        ));
    }
    if summary.is_empty() || summary.chars().count() > 400 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Chinese summary must contain 1 to 400 characters",
        ));
    }
    let center = center_root()?;
    ensure_skill_path(&center, &center.join(&input.skill_id).join(SKILL_FILE))?;

    let mut store = load_translations().unwrap_or_default();
    store.translations.insert(
        input.skill_id,
        TranslationRecord {
            name_zh: name.to_owned(),
            summary_zh: summary.to_owned(),
        },
    );
    write_translations(&store)
}

pub fn connect(skill_id: &str, tool_id: &str) -> io::Result<()> {
    validate_id(skill_id)?;
    let center = center_root()?;
    let home = home_root()?;
    let source = center.join(skill_id);
    ensure_skill_path(&center, &source.join(SKILL_FILE))?;
    let spec = find_tool(tool_id)?;
    let target_dir = home.join(spec.root).join(spec.skills_dir);
    let target = target_dir.join(skill_id);
    fs::create_dir_all(&target_dir)?;

    match connection_mode(&source, &target) {
        ConnectionMode::Link | ConnectionMode::Copy => return Ok(()),
        ConnectionMode::Conflict | ConnectionMode::Broken => {
            return Err(io::Error::new(
                io::ErrorKind::AlreadyExists,
                format!(
                    "{} already exists and is not managed by BaoCanMou",
                    display_path(&target)
                ),
            ));
        }
        ConnectionMode::None => {}
    }

    create_managed_connection(&source, &target)
}

pub fn disconnect(skill_id: &str, tool_id: &str) -> io::Result<()> {
    validate_id(skill_id)?;
    let center = center_root()?;
    let home = home_root()?;
    let source = center.join(skill_id);
    let spec = find_tool(tool_id)?;
    let target = home.join(spec.root).join(spec.skills_dir).join(skill_id);

    match connection_mode(&source, &target) {
        ConnectionMode::None => Ok(()),
        ConnectionMode::Link => fs::remove_file(target),
        ConnectionMode::Copy => fs::remove_dir_all(target),
        ConnectionMode::Broken | ConnectionMode::Conflict => Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "refusing to remove an unmanaged or broken target",
        )),
    }
}

fn inspect_skill(
    center: &Path,
    home: &Path,
    id: &str,
    path: &Path,
    translations: &TranslationStore,
) -> SkillAsset {
    let skill_file = path.join(SKILL_FILE);
    let markdown = fs::read_to_string(&skill_file).unwrap_or_default();
    let metadata = parse_frontmatter(&markdown);
    let name_en = metadata
        .get("name")
        .cloned()
        .unwrap_or_else(|| id.replace('-', " "));
    let summary_en = metadata.get("description").cloned().unwrap_or_default();
    let category = infer_category(&format!("{id} {name_en} {summary_en}"));
    let generated_name = chinese_name(id, &name_en, &category);
    let custom = translations.translations.get(id);
    let metadata_name_zh = metadata.get("name_zh").filter(|value| contains_cjk(value));
    let metadata_summary_zh = metadata
        .get("description_zh")
        .filter(|value| contains_cjk(value));
    let name_zh = custom
        .map(|value| value.name_zh.clone())
        .or_else(|| metadata_name_zh.cloned())
        .unwrap_or(generated_name);
    let purpose_zh = purpose_for_skill(id, &name_zh, &summary_en, &category);
    let generated_summary = format!("{purpose_zh} 英文标识为 {id}，原始调用契约保持不变。");
    let summary_zh = custom
        .map(|value| value.summary_zh.clone())
        .or_else(|| metadata_summary_zh.cloned())
        .unwrap_or(generated_summary);
    let purpose_en = purpose_for_category(&category, &name_en, "en");
    let translation_mode = if custom.is_some() {
        "custom"
    } else if metadata_name_zh.is_some() || contains_cjk(&name_en) {
        "native"
    } else {
        "generated"
    };
    let (risk_level, risk_flags) = risk_assessment(&markdown);
    let file_count = count_files(path, 5).unwrap_or(0);
    let (features_zh, features_en) = feature_labels(path, &markdown, &risk_flags);
    let preview_kind = if find_preview_image(path).is_some() {
        "screenshot"
    } else {
        "generated"
    };
    let content_hash = sha256_text(&markdown);
    let modified_at = fs::metadata(&skill_file)
        .and_then(|value| value.modified())
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_secs())
        .unwrap_or_default();
    let connections = tool_specs()
        .iter()
        .map(|tool| {
            let target = home.join(tool.root).join(tool.skills_dir).join(id);
            SkillConnection {
                tool_id: tool.id.to_owned(),
                mode: connection_mode(path, &target).as_str().to_owned(),
            }
        })
        .collect::<Vec<_>>();
    let has_frontmatter = markdown.trim_start().starts_with("---");
    let score = readiness_score(
        !markdown.is_empty(),
        has_frontmatter,
        !summary_en.is_empty() || contains_cjk(&summary_zh),
        &risk_level,
        !content_hash.is_empty(),
        path.starts_with(center),
    );
    let status = if markdown.is_empty() {
        "invalid"
    } else if risk_level == "high" || !has_frontmatter {
        "attention"
    } else {
        "ready"
    };

    SkillAsset {
        id: id.to_owned(),
        name_zh,
        name_en,
        summary_zh,
        summary_en,
        purpose_zh,
        purpose_en,
        features_zh,
        features_en,
        category,
        path: display_path(path),
        score,
        status: status.to_owned(),
        risk_level,
        risk_flags,
        file_count,
        content_hash,
        modified_at,
        translation_mode: translation_mode.to_owned(),
        preview_kind: preview_kind.to_owned(),
        connections,
    }
}

fn inspect_tools(home: &Path, center: &Path, skills: &[SkillAsset]) -> Vec<ToolStatus> {
    tool_specs()
        .iter()
        .map(|tool| {
            let root = home.join(tool.root);
            let skills_path = root.join(tool.skills_dir);
            let mut linked_count = 0;
            let mut conflict_count = 0;
            for skill in skills {
                let source = center.join(&skill.id);
                let target = skills_path.join(&skill.id);
                match connection_mode(&source, &target) {
                    ConnectionMode::Link | ConnectionMode::Copy => linked_count += 1,
                    ConnectionMode::Broken | ConnectionMode::Conflict => conflict_count += 1,
                    ConnectionMode::None => {}
                }
            }
            ToolStatus {
                id: tool.id.to_owned(),
                name: tool.name.to_owned(),
                detected: root.exists(),
                skills_path: display_path(&skills_path),
                linked_count,
                conflict_count,
            }
        })
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ConnectionMode {
    None,
    Link,
    Copy,
    Broken,
    Conflict,
}

impl ConnectionMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Link => "link",
            Self::Copy => "copy",
            Self::Broken => "broken",
            Self::Conflict => "conflict",
        }
    }
}

fn connection_mode(source: &Path, target: &Path) -> ConnectionMode {
    let Ok(metadata) = fs::symlink_metadata(target) else {
        return ConnectionMode::None;
    };
    if metadata.file_type().is_symlink() {
        let Ok(link) = fs::read_link(target) else {
            return ConnectionMode::Broken;
        };
        let resolved = if link.is_absolute() {
            link
        } else {
            target.parent().unwrap_or_else(|| Path::new(".")).join(link)
        };
        return if canonical_or_clean(&resolved) == canonical_or_clean(source) {
            ConnectionMode::Link
        } else if resolved.exists() {
            ConnectionMode::Conflict
        } else {
            ConnectionMode::Broken
        };
    }
    if metadata.is_dir() {
        let marker = target.join(COPY_MARKER);
        if let Ok(recorded_source) = fs::read_to_string(marker) {
            if canonical_or_clean(Path::new(recorded_source.trim())) == canonical_or_clean(source) {
                return ConnectionMode::Copy;
            }
        }
    }
    ConnectionMode::Conflict
}

#[cfg(unix)]
fn create_managed_connection(source: &Path, target: &Path) -> io::Result<()> {
    std::os::unix::fs::symlink(source, target)
}

#[cfg(windows)]
fn create_managed_connection(source: &Path, target: &Path) -> io::Result<()> {
    if std::os::windows::fs::symlink_dir(source, target).is_ok() {
        return Ok(());
    }
    copy_tree(source, target)?;
    fs::write(target.join(COPY_MARKER), display_path(source))
}

#[cfg(windows)]
fn copy_tree(source: &Path, target: &Path) -> io::Result<()> {
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let destination = target.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_tree(&entry.path(), &destination)?;
        } else {
            fs::copy(entry.path(), destination)?;
        }
    }
    Ok(())
}

fn risk_assessment(markdown: &str) -> (String, Vec<String>) {
    let lower = markdown.to_lowercase();
    let checks = [
        (
            "destructive-command",
            ["rm -rf", "remove-item -recurse -force"].as_slice(),
        ),
        ("privilege-escalation", ["sudo ", "runas "].as_slice()),
        (
            "credential-access",
            ["cookie", "private key", "access token", "api key"].as_slice(),
        ),
        (
            "remote-execution",
            ["curl ", "wget ", "invoke-webrequest", "eval("].as_slice(),
        ),
    ];
    let mut flags = Vec::new();
    for (flag, patterns) in checks {
        if patterns.iter().any(|pattern| lower.contains(pattern)) {
            flags.push(flag.to_owned());
        }
    }
    let level = if flags
        .iter()
        .any(|flag| flag == "destructive-command" || flag == "privilege-escalation")
    {
        "high"
    } else if flags.is_empty() {
        "low"
    } else {
        "medium"
    };
    (level.to_owned(), flags)
}

fn readiness_score(
    has_skill_file: bool,
    has_frontmatter: bool,
    has_description: bool,
    risk_level: &str,
    has_hash: bool,
    in_center: bool,
) -> u8 {
    let structure = u8::from(has_skill_file) * 15 + u8::from(has_frontmatter) * 10;
    let understanding = u8::from(has_description) * 20;
    let portability = u8::from(in_center) * 20;
    let safety = match risk_level {
        "low" => 20,
        "medium" => 12,
        _ => 4,
    };
    let verifiability = u8::from(has_hash) * 15;
    structure + understanding + portability + safety + verifiability
}

fn parse_frontmatter(markdown: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();
    let mut lines = markdown.lines();
    if lines.next().map(str::trim) != Some("---") {
        return values;
    }
    for line in lines {
        if line.trim() == "---" {
            break;
        }
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let key = key.trim();
        if ["name", "description", "name_zh", "description_zh"].contains(&key) {
            values.insert(
                key.to_owned(),
                value.trim().trim_matches(['\'', '"']).to_owned(),
            );
        }
    }
    values
}

fn infer_category(text: &str) -> String {
    let lower = text.to_lowercase();
    let categories = [
        (
            "design",
            ["design", "ui", "ux", "image", "visual", "logo"].as_slice(),
        ),
        (
            "development",
            ["code", "develop", "debug", "api", "frontend", "backend"].as_slice(),
        ),
        (
            "content",
            ["content", "copy", "article", "writing", "seo", "marketing"].as_slice(),
        ),
        ("presentation", ["ppt", "slide", "presentation"].as_slice()),
        (
            "video",
            ["video", "motion", "caption", "remotion"].as_slice(),
        ),
        (
            "data",
            ["data", "chart", "spreadsheet", "analytics", "database"].as_slice(),
        ),
        (
            "security",
            ["security", "threat", "vulnerability", "audit"].as_slice(),
        ),
        (
            "automation",
            ["automation", "browser", "workflow", "deploy", "ci"].as_slice(),
        ),
    ];
    for (category, keywords) in categories {
        if keywords.iter().any(|keyword| lower.contains(keyword)) {
            return category.to_owned();
        }
    }
    "general".to_owned()
}

fn chinese_name(id: &str, name_en: &str, category: &str) -> String {
    if contains_cjk(name_en) {
        return name_en.to_owned();
    }
    let tokens = id
        .split(|character: char| !character.is_ascii_alphanumeric())
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>();
    let translated = tokens
        .iter()
        .map(|token| translate_token(token))
        .filter(|token| !token.is_empty())
        .collect::<Vec<_>>()
        .join("·");
    if contains_cjk(&translated) {
        translated
    } else {
        format!("{}能力·{}", category_label(category), name_en)
    }
}

fn translate_token(token: &str) -> String {
    let lower = token.to_lowercase();
    let translated = match lower.as_str() {
        "ai" => "AI",
        "agent" | "agents" => "智能体",
        "api" => "接口",
        "app" | "apps" => "应用",
        "article" => "文章",
        "audit" => "审计",
        "automation" => "自动化",
        "backend" => "后端",
        "brand" => "品牌",
        "browser" => "浏览器",
        "build" | "builder" => "构建",
        "business" => "商业",
        "caption" | "captions" => "字幕",
        "chart" | "charts" => "图表",
        "clean" => "清理",
        "cli" => "命令行",
        "code" | "coding" => "代码",
        "comic" => "漫画",
        "competitive" | "competitor" => "竞品",
        "content" => "内容",
        "copy" | "copywriting" => "文案",
        "create" | "creator" => "创作",
        "customer" => "客户",
        "data" => "数据",
        "database" => "数据库",
        "debug" | "debugging" => "调试",
        "deploy" => "部署",
        "design" => "设计",
        "development" | "developer" => "开发",
        "document" | "documents" => "文档",
        "edit" | "editing" | "editorial" => "编辑",
        "engineering" => "工程",
        "explain" | "explainer" => "解释",
        "figma" => "Figma",
        "finance" => "财务",
        "frontend" => "前端",
        "general" => "通用",
        "generate" | "generator" => "生成",
        "git" | "github" => "Git",
        "image" => "图像",
        "install" | "installer" => "安装",
        "keyword" => "关键词",
        "knowledge" => "知识",
        "logo" => "标志",
        "management" => "管理",
        "marketing" => "营销",
        "media" => "媒体",
        "minimal" | "minimalist" => "极简",
        "motion" => "动效",
        "music" => "音乐",
        "pdf" => "PDF",
        "performance" => "性能",
        "plan" | "planning" => "规划",
        "plugin" => "插件",
        "ppt" | "presentation" | "presentations" | "slides" => "演示文稿",
        "product" => "产品",
        "project" => "项目",
        "prompt" => "提示词",
        "research" => "研究",
        "review" => "评审",
        "sales" => "销售",
        "search" => "搜索",
        "security" => "安全",
        "seo" => "搜索优化",
        "skill" | "skills" => "技能",
        "social" => "社交内容",
        "spreadsheet" | "spreadsheets" => "电子表格",
        "strategy" => "策略",
        "sync" => "同步",
        "test" | "testing" => "测试",
        "tool" | "tools" => "工具",
        "translate" | "translation" => "翻译",
        "ui" => "界面",
        "ux" => "体验",
        "video" => "视频",
        "visual" | "visualization" => "视觉",
        "web" | "website" => "网页",
        "workflow" => "工作流",
        "writing" => "写作",
        "3d" => "三维",
        "action" => "行动",
        "adrs" => "架构决策记录",
        "analysis" => "分析",
        "and" | "as" | "me" | "to" | "using" | "with" => "",
        "animation" => "动画",
        "anything" => "全内容",
        "architecture" => "架构",
        "art" => "艺术",
        "audio" => "音频",
        "austrian" => "奥地利学派",
        "autumn" => "秋季",
        "baocanmou" | "bcm" => "包参谋",
        "baocut" => "包剪",
        "bases" => "数据库视图",
        "batch" => "批量",
        "benchmark" => "基准测试",
        "blue" => "蓝色",
        "bluegreen" => "蓝绿发布",
        "breakdown" => "拆解",
        "bridge" => "桥接",
        "brutalist" => "粗野主义",
        "btpanel" => "宝塔面板",
        "bw" => "黑白",
        "campus" => "校园",
        "canvas" => "画布",
        "card" => "卡片",
        "cd" => "持续交付",
        "center" => "中心",
        "chalkboard" => "黑板风",
        "chatroom" => "聊天室",
        "check" => "检查",
        "chinese" => "中文",
        "ci" => "持续集成",
        "circuit" => "电路",
        "cleaner" => "清理器",
        "clustering" => "聚类",
        "coach" => "教练",
        "color" => "配色",
        "constraint" => "约束",
        "context" => "上下文",
        "core" => "核心",
        "corporate" => "企业",
        "courseware" => "课件",
        "creative" => "创意",
        "cyan" => "青色",
        "dark" => "深色",
        "dbs" => "DBS",
        "decision" => "决策",
        "deconstruct" => "解构",
        "deed" => "善行",
        "defense" => "答辩",
        "defuddle" => "网页正文提取",
        "deprecation" => "弃用",
        "devtools" => "开发者工具",
        "diagnosis" | "doctor" => "诊断",
        "director" => "导演",
        "doodle" => "涂鸦",
        "doubt" => "质疑",
        "driven" => "驱动",
        "ecommerce" => "电商",
        "education" => "教育",
        "elegant" => "雅致",
        "eli5" => "五岁能懂",
        "elon" => "埃隆",
        "embedded" => "内嵌",
        "enablement" => "赋能资料",
        "energy" => "活力",
        "enterprise" => "企业",
        "error" => "错误",
        "esa" => "ESA",
        "extract" => "提取",
        "faceless" => "无真人出镜",
        "feynman" => "费曼",
        "files" => "文件",
        "flow" => "流程",
        "four" => "四格",
        "frameworks" => "框架",
        "gimi" => "Gimi",
        "girl" => "女孩",
        "glass" => "玻璃质感",
        "goal" => "目标",
        "gold" => "金色",
        "good" => "好问题",
        "gpt" => "GPT",
        "graphics" => "图形",
        "green" => "绿色",
        "gsap" => "GSAP",
        "guizang" => "归藏",
        "handdraw" | "handdrawn" => "手绘",
        "hardening" => "加固",
        "head" => "头像",
        "hook" => "钩子",
        "html" => "HTML",
        "hyperframes" => "Hyperframes",
        "idea" => "创意",
        "identity" => "身份识别",
        "imagegen" => "图像生成",
        "impeccable" => "精修",
        "implementation" => "实现",
        "incremental" => "增量",
        "industry" => "产业",
        "infographic" => "信息图",
        "instrumentation" => "监测埋点",
        "interface" => "界面接口",
        "interview" => "访谈",
        "ip" => "知识产权",
        "iridescent" => "虹彩",
        "jobs" => "任务",
        "json" => "JSON",
        "keyframes" => "关键帧",
        "landscape" => "格局",
        "last30days" => "近三十天",
        "launch" => "发布",
        "lavender" => "薰衣草紫",
        "learning" => "学习",
        "link" => "链接",
        "local" => "本地",
        "markdown" => "Markdown",
        "maker" => "制作",
        "markitdown" => "文档转换",
        "material" => "素材",
        "migration" => "迁移",
        "mint" => "薄荷绿",
        "mobile" => "移动端",
        "mono" => "单色",
        "multicolor" => "多彩",
        "musk" => "马斯克",
        "neon" => "霓虹",
        "new" => "新式",
        "notebooklm" => "NotebookLM",
        "notion" => "Notion",
        "observability" => "可观测性",
        "obsidian" => "Obsidian",
        "offers" => "报价方案",
        "office" => "办公",
        "opener" => "开场",
        "ops" => "运营运维",
        "optimization" | "optimizer" => "优化",
        "orange" => "橙色",
        "output" => "完整输出",
        "panda" => "熊猫",
        "panel" => "分镜",
        "paper" => "纸张",
        "perspective" => "视角",
        "platform" => "平台",
        "plugins" => "插件",
        "pr" => "合并请求",
        "precheck" => "预检",
        "pricing" => "定价",
        "profiling" => "画像分析",
        "progress" => "进度",
        "prospecting" => "潜客开发",
        "publish" | "publisher" => "发布",
        "pure" => "纯白",
        "qc" | "quality" => "质量检查",
        "qiaomu" => "乔木",
        "question" => "提问",
        "reach" => "触达",
        "react" => "React",
        "real" => "真实场景",
        "recovery" => "恢复",
        "recut" => "再剪辑",
        "red" => "红色",
        "redesign" => "重新设计",
        "refine" => "优化完善",
        "registry" => "注册表",
        "release" => "发布",
        "remotion" => "Remotion",
        "renhua" => "人话表达",
        "replica" => "复刻",
        "report" => "报告",
        "resonate" => "共鸣",
        "restore" => "恢复",
        "resume" => "简历",
        "rn" => "RN",
        "rural" => "乡村",
        "saas" => "SaaS",
        "safe" => "安全",
        "save" => "保存",
        "schema" => "模式",
        "script" => "脚本",
        "scrolltrigger" => "滚动触发",
        "setup" => "配置",
        "shipping" => "交付上线",
        "simplification" => "简化",
        "site" => "网站",
        "sketch" => "草图",
        "slideshow" => "幻灯片",
        "slowisfast" => "慢即是快",
        "soft" => "高级视觉",
        "source" => "来源",
        "spec" => "规格",
        "spread" => "传播",
        "src" => "源码",
        "steve" => "史蒂夫",
        "stitch" => "拼接",
        "story" => "故事",
        "system" => "系统",
        "talking" => "口播",
        "task" => "任务",
        "taste" | "tasteskill" => "审美",
        "teal" => "青绿色",
        "tech" => "科技",
        "text" => "文字",
        "timeline" => "时间线",
        "title" => "标题",
        "training" => "培训",
        "trust" => "可信发布",
        "update" => "更新",
        "use" => "使用",
        "utils" => "工具集",
        "versioning" => "版本管理",
        "visuals" => "视觉素材",
        "warm" => "暖色",
        "watch" => "监测",
        "watercolor" => "水彩",
        "wechat" => "微信",
        "white" => "白色",
        "whiteboard" => "白板",
        "wordpress" => "WordPress",
        "xhs" => "小红书",
        "yellow" => "黄色",
        "yuwen" => "语文",
        _ => token,
    };
    translated.to_owned()
}

fn purpose_for_skill(id: &str, name_zh: &str, summary_en: &str, category: &str) -> String {
    let key = format!("{id} {summary_en}").to_lowercase();
    let rules = [
        (
            ["find-skills", "skill-installer", "skill-center"].as_slice(),
            "发现、筛选和管理可供 AI 使用的技能能力",
        ),
        (
            ["anything-to-notebooklm", "notebooklm"].as_slice(),
            "把网页、文档、音视频等资料整理后导入 NotebookLM",
        ),
        (
            ["ppt", "presentation", "slides", "courseware", "infographic"].as_slice(),
            "规划演示结构、设计版式并生成可编辑的 PPT 成品",
        ),
        (
            [
                "video", "remotion", "motion", "caption", "recut", "faceless",
            ]
            .as_slice(),
            "完成视频策划、剪辑、字幕、动效或成片输出",
        ),
        (
            ["mono-color"].as_slice(),
            "用单一主色建立克制、统一、具有品牌感的视觉方案",
        ),
        (
            [
                "imagegen",
                "image-gen",
                "illustration",
                "comic",
                "logo",
                "visuals",
            ]
            .as_slice(),
            "生成或优化插画、配图、标志等视觉素材",
        ),
        (
            ["taste", "impeccable", "design", "ui", "ux", "figma"].as_slice(),
            "改善界面、配色、版式和视觉层级，减少 AI 模板感",
        ),
        (
            ["browser", "playwright", "devtools", "website-to"].as_slice(),
            "让 AI 操作或测试网页，读取页面状态并验证交互结果",
        ),
        (
            [
                "spreadsheet",
                "chart",
                "analytics",
                "data-quality",
                "dashboard",
                "kpi",
            ]
            .as_slice(),
            "整理和分析数据，生成图表、看板与可复核结论",
        ),
        (
            ["pdf", "document", "markitdown", "markdown"].as_slice(),
            "读取、转换、编辑或交付 PDF 与常见文档",
        ),
        (
            [
                "security",
                "threat",
                "vulnerability",
                "attack-path",
                "hardening",
            ]
            .as_slice(),
            "发现安全风险、分析攻击路径并验证修复结果",
        ),
        (
            [
                "wordpress",
                "publisher",
                "publish",
                "shipping",
                "deploy",
                "release",
            ]
            .as_slice(),
            "执行网站或项目发布，并回读线上状态完成验收",
        ),
        (
            ["git", "github", "versioning", "ci-cd", "gh-"].as_slice(),
            "管理 Git 版本、代码协作、持续集成与发布流程",
        ),
        (
            ["seo", "geo", "keyword", "link-prospecting"].as_slice(),
            "研究关键词并优化内容，使搜索引擎和 AI 更容易理解与推荐",
        ),
        (
            ["wechat", "xhs", "copy", "article", "editorial", "content"].as_slice(),
            "策划、撰写和优化内容，形成适合目标平台的可发布稿件",
        ),
        (
            [
                "competitor",
                "competitive",
                "customer-research",
                "market-sizing",
                "interview",
            ]
            .as_slice(),
            "开展客户、市场或竞品研究，并整理为可行动的判断",
        ),
        (
            [
                "marketing",
                "sales",
                "pricing",
                "offers",
                "product-marketing",
            ]
            .as_slice(),
            "制定营销、销售、定价或产品传播方案",
        ),
        (
            ["obsidian"].as_slice(),
            "整理 Obsidian 知识库内容、视图和交付归档",
        ),
        (
            ["eli5", "feynman", "explainer"].as_slice(),
            "把复杂知识改写成更直白、易懂、便于学习的解释",
        ),
        (
            [
                "code",
                "debug",
                "testing",
                "api",
                "frontend",
                "backend",
                "architecture",
            ]
            .as_slice(),
            "辅助编写、检查和改进代码，控制工程质量与交付范围",
        ),
        (
            ["automation", "workflow", "agent", "cli"].as_slice(),
            "把重复任务整理为 AI 可执行、可复用、可检查的流程",
        ),
        (
            ["audio", "music"].as_slice(),
            "处理音频、音乐或配音素材并服务于内容交付",
        ),
        (
            ["dbs-"].as_slice(),
            "按 DBS 方法完成对应思考任务，并输出结构化结论",
        ),
    ];
    for (patterns, purpose) in rules {
        if patterns.iter().any(|pattern| key.contains(pattern)) {
            return format!("{purpose}。");
        }
    }
    let fallback = match category {
        "design" => "把视觉需求转成可检查、可交付的设计结果",
        "development" => "辅助代码开发、工程判断与交付质量控制",
        "content" => "辅助内容策划、表达优化与传播交付",
        "presentation" => "辅助演示文稿的结构、版式与成品输出",
        "video" => "辅助视频策划、剪辑、动效与成片表达",
        "data" => "辅助数据整理、分析、图表与结论表达",
        "security" => "辅助发现安全风险并验证处理结果",
        "automation" => "把重复操作整理为可复用的自动化流程",
        _ => "为对应任务提供结构化步骤与质量检查",
    };
    format!("{name_zh}用于{fallback}。")
}

fn purpose_for_category(category: &str, name: &str, locale: &str) -> String {
    let purpose = if locale == "zh" {
        match category {
            "design" => "把视觉需求转成可检查、可交付的设计结果",
            "development" => "辅助代码开发、工程判断与交付质量控制",
            "content" => "辅助内容策划、表达优化与传播交付",
            "presentation" => "辅助演示文稿的结构、版式与成品输出",
            "video" => "辅助视频策划、剪辑、动效与成片表达",
            "data" => "辅助数据整理、分析、图表与结论表达",
            "security" => "辅助发现安全风险并验证处理结果",
            "automation" => "把重复操作整理为可复用的自动化流程",
            _ => "为对应任务提供结构化步骤与质量检查",
        }
    } else {
        match category {
            "design" => "turn visual requirements into reviewable design deliverables",
            "development" => {
                "support software development, engineering judgment, and delivery quality"
            }
            "content" => "support content planning, editing, and distribution-ready delivery",
            "presentation" => "support presentation structure, layout, and editable output",
            "video" => "support video planning, editing, motion, and final delivery",
            "data" => "support data preparation, analysis, charts, and conclusions",
            "security" => "identify security risks and verify remediation",
            "automation" => "turn repeated operations into reusable automated workflows",
            _ => "provide structured execution and quality checks for the task",
        }
    };
    if locale == "zh" {
        format!("{name}：{purpose}。")
    } else {
        format!("{name}: designed to {purpose}.")
    }
}

fn feature_labels(
    path: &Path,
    markdown: &str,
    risk_flags: &[String],
) -> (Vec<String>, Vec<String>) {
    let mut zh = vec![
        "保留标准 SKILL.md 调用契约".to_owned(),
        "可在多个 AI 工具间复用".to_owned(),
    ];
    let mut en = vec![
        "Keeps the standard SKILL.md contract".to_owned(),
        "Reusable across multiple AI tools".to_owned(),
    ];
    let mut has_script = false;
    let mut has_reference = false;
    let mut has_visual = false;
    inspect_feature_files(
        path,
        4,
        &mut has_script,
        &mut has_reference,
        &mut has_visual,
    );
    if has_script {
        zh.push("包含可执行脚本，使用前应检查依赖和写入范围".to_owned());
        en.push("Includes executable scripts; review dependencies and write scope".to_owned());
    }
    if has_reference {
        zh.push("附带参考资料或模板，可减少重复整理".to_owned());
        en.push("Includes references or templates to reduce repeated preparation".to_owned());
    }
    if has_visual {
        zh.push("包含可展示的视觉示例或截图".to_owned());
        en.push("Includes visual examples or screenshots".to_owned());
    }
    let lower = markdown.to_lowercase();
    if lower.contains("browser") || lower.contains("http") {
        zh.push("可能访问浏览器或网络，执行时需确认授权".to_owned());
        en.push("May access a browser or network; confirm authorization before use".to_owned());
    }
    if !risk_flags.is_empty() {
        zh.push("检测到静态风险特征，需要阅读原文复核".to_owned());
        en.push("Static risk signals detected; read the source before use".to_owned());
    }
    zh.truncate(5);
    en.truncate(5);
    (zh, en)
}

fn inspect_feature_files(
    path: &Path,
    depth: usize,
    script: &mut bool,
    reference: &mut bool,
    visual: &mut bool,
) {
    if depth == 0 || !path.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if entry_path.is_dir() {
            if matches!(
                name.as_str(),
                "references" | "reference" | "templates" | "examples" | "docs"
            ) {
                *reference = true;
            }
            inspect_feature_files(&entry_path, depth - 1, script, reference, visual);
            continue;
        }
        let extension = entry_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();
        if matches!(
            extension.as_str(),
            "py" | "sh" | "bash" | "js" | "mjs" | "ts" | "rb" | "ps1"
        ) {
            *script = true;
        }
        if matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
            *visual = true;
        }
    }
}

fn find_preview_image(path: &Path) -> Option<PathBuf> {
    let mut candidates = Vec::new();
    collect_preview_images(path, 4, &mut candidates);
    candidates.sort_by_key(|candidate| {
        let name = candidate
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();
        let priority = if name.contains("screenshot") || name.contains("preview") {
            0
        } else if name.contains("cover") || name.contains("example") {
            1
        } else {
            2
        };
        (priority, name)
    });
    candidates.into_iter().find(|candidate| {
        fs::metadata(candidate)
            .map(|value| value.len() <= 2 * 1024 * 1024)
            .unwrap_or(false)
    })
}

fn collect_preview_images(path: &Path, depth: usize, output: &mut Vec<PathBuf>) {
    if depth == 0 || !path.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry.file_name().to_string_lossy().starts_with('.') {
            continue;
        }
        if entry_path.is_dir() {
            collect_preview_images(&entry_path, depth - 1, output);
            continue;
        }
        let extension = entry_path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();
        if matches!(extension.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif") {
            output.push(entry_path);
        }
    }
}

fn read_preview_data_url(path: &Path) -> io::Result<Option<String>> {
    let Some(image) = find_preview_image(path) else {
        return Ok(None);
    };
    let extension = image
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => return Ok(None),
    };
    let encoded = base64::engine::general_purpose::STANDARD.encode(fs::read(image)?);
    Ok(Some(format!("data:{mime};base64,{encoded}")))
}

fn category_label(category: &str) -> &'static str {
    match category {
        "design" => "设计",
        "development" => "开发",
        "content" => "内容",
        "presentation" => "演示",
        "video" => "视频",
        "data" => "数据",
        "security" => "安全",
        "automation" => "自动化",
        _ => "通用",
    }
}

fn contains_cjk(value: &str) -> bool {
    value
        .chars()
        .any(|character| matches!(character as u32, 0x3400..=0x9fff | 0xf900..=0xfaff))
}

fn count_files(path: &Path, depth: usize) -> io::Result<usize> {
    if depth == 0 || !path.is_dir() {
        return Ok(0);
    }
    let mut count = 0;
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        if file_type.is_file() {
            count += 1;
        } else if file_type.is_dir() {
            count += count_files(&entry.path(), depth - 1)?;
        }
    }
    Ok(count)
}

fn sorted_entries(path: &Path) -> io::Result<Vec<fs::DirEntry>> {
    let mut entries = fs::read_dir(path)?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(fs::DirEntry::file_name);
    Ok(entries)
}

fn is_hidden(name: &std::ffi::OsStr) -> bool {
    name.to_string_lossy().starts_with('.')
}

fn validate_id(value: &str) -> io::Result<()> {
    let path = Path::new(value);
    let valid = !value.is_empty()
        && value != "."
        && value != ".."
        && path
            .components()
            .all(|component| matches!(component, Component::Normal(_)))
        && path.components().count() == 1;
    if valid {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "invalid skill identifier",
        ))
    }
}

fn ensure_skill_path(center: &Path, candidate: &Path) -> io::Result<()> {
    let center = fs::canonicalize(center)?;
    let candidate = fs::canonicalize(candidate)?;
    if candidate.starts_with(center) {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "skill path leaves the center root",
        ))
    }
}

fn find_tool(tool_id: &str) -> io::Result<ToolSpec> {
    tool_specs()
        .into_iter()
        .find(|tool| tool.id == tool_id)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "unknown tool identifier"))
}

fn center_root() -> io::Result<PathBuf> {
    if let Some(custom) = std::env::var_os("BAOCANMOU_SKILLS_HOME") {
        return Ok(PathBuf::from(custom));
    }
    Ok(home_root()?.join(".agents").join("skills"))
}

fn state_file() -> io::Result<PathBuf> {
    Ok(home_root()?
        .join(".baocanmou")
        .join("skill-center")
        .join("translations.json"))
}

fn home_root() -> io::Result<PathBuf> {
    dirs::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "home directory is unavailable"))
}

fn load_translations() -> io::Result<TranslationStore> {
    let path = state_file()?;
    if !path.exists() {
        return Ok(TranslationStore::default());
    }
    let content = fs::read_to_string(path)?;
    serde_json::from_str(&content)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

fn write_translations(store: &TranslationStore) -> io::Result<()> {
    let path = state_file()?;
    let parent = path
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "invalid state path"))?;
    fs::create_dir_all(parent)?;
    let temporary = parent.join("translations.json.tmp");
    let content = serde_json::to_vec_pretty(store).map_err(io::Error::other)?;
    fs::write(&temporary, content)?;
    fs::rename(temporary, path)
}

fn sha256_text(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn canonical_or_clean(path: &Path) -> PathBuf {
    fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn now_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frontmatter_parser_reads_supported_fields() {
        let parsed = parse_frontmatter("---\nname: code-review\ndescription: Review code safely\nname_zh: 代码评审\n---\n# Body");
        assert_eq!(parsed.get("name"), Some(&"code-review".to_owned()));
        assert_eq!(parsed.get("name_zh"), Some(&"代码评审".to_owned()));
    }

    #[test]
    fn chinese_name_translates_known_tokens() {
        assert_eq!(
            chinese_name("code-review", "code-review", "development"),
            "代码·评审"
        );
        assert_eq!(
            chinese_name("video-maker", "video-maker", "video"),
            "视频·制作"
        );
    }

    #[test]
    fn chinese_purpose_explains_the_actual_job() {
        assert_eq!(
            purpose_for_skill(
                "agent-browser",
                "智能体·浏览器",
                "browser automation",
                "automation"
            ),
            "让 AI 操作或测试网页，读取页面状态并验证交互结果。"
        );
        assert_eq!(
            purpose_for_skill(
                "qiaomu-anything-to-notebooklm",
                "乔木·全内容·NotebookLM",
                "",
                "presentation"
            ),
            "把网页、文档、音视频等资料整理后导入 NotebookLM。"
        );
    }

    #[test]
    fn risk_assessment_marks_destructive_commands_high() {
        let (level, flags) = risk_assessment("Run `sudo rm -rf /tmp/example`");
        assert_eq!(level, "high");
        assert!(flags.contains(&"destructive-command".to_owned()));
        assert!(flags.contains(&"privilege-escalation".to_owned()));
    }

    #[test]
    fn readiness_score_has_explainable_weights() {
        assert_eq!(readiness_score(true, true, true, "low", true, true), 100);
        assert_eq!(readiness_score(true, false, true, "high", true, true), 74);
    }

    #[test]
    fn rejects_nested_skill_identifiers() {
        assert!(validate_id("safe-skill").is_ok());
        assert!(validate_id("../unsafe").is_err());
        assert!(validate_id("nested/skill").is_err());
    }
}
