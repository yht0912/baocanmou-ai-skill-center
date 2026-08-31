use anyhow::{Context, Result};
use serde::Deserialize;

use super::network_proxy::{get_github_proxy_url, github_http_client};
use super::skill_store::SkillStore;

const FEATURED_SKILLS_URL: &str =
    "https://raw.githubusercontent.com/yht0912/baocanmou-ai-skill-center/main/featured-skills.json";

const CACHE_KEY: &str = "featured_skills_cache";

// Bundled fallback so the app works even before the first network fetch succeeds.
const BUNDLED_JSON: &str = include_str!("../../../featured-skills.json");

#[derive(Debug, Deserialize)]
struct FeaturedSkillsData {
    skills: Vec<FeaturedSkillRaw>,
}

#[derive(Debug, Deserialize)]
struct FeaturedSkillRaw {
    #[serde(default)]
    rank: u64,
    slug: String,
    name: String,
    #[serde(default)]
    summary: String,
    #[serde(default)]
    downloads: u64,
    #[serde(default)]
    stars: u64,
    #[serde(default)]
    forks: u64,
    #[serde(default)]
    popularity_score: f64,
    #[serde(default)]
    recommendation_score: f64,
    #[serde(default)]
    recommendation_tier: String,
    #[serde(default)]
    recommendation_reasons: Vec<String>,
    #[serde(default)]
    review_flags: Vec<String>,
    #[serde(default)]
    license: String,
    #[serde(default)]
    official: bool,
    #[serde(default)]
    source_url: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FeaturedSkill {
    pub rank: u64,
    pub slug: String,
    pub name: String,
    pub summary: String,
    pub downloads: u64,
    pub stars: u64,
    pub forks: u64,
    pub popularity_score: f64,
    pub recommendation_score: f64,
    pub recommendation_tier: String,
    pub recommendation_reasons: Vec<String>,
    pub review_flags: Vec<String>,
    pub license: String,
    pub official: bool,
    pub source_url: String,
}

pub fn fetch_featured_skills(store: &SkillStore) -> Result<Vec<FeaturedSkill>> {
    fetch_featured_skills_inner(FEATURED_SKILLS_URL, store)
}

fn fetch_featured_skills_inner(url: &str, store: &SkillStore) -> Result<Vec<FeaturedSkill>> {
    let proxy_url = get_github_proxy_url(store)?;
    if let Ok(json_str) = fetch_from_url(url, &proxy_url) {
        if let Ok(skills) = parse_and_filter(&json_str) {
            if !skills.is_empty() {
                let _ = store.set_setting(CACHE_KEY, &json_str);
                return Ok(skills);
            }
        }
    }
    // Fallback to cache
    if let Ok(Some(cached)) = store.get_setting(CACHE_KEY) {
        if let Ok(skills) = parse_and_filter(&cached) {
            if !skills.is_empty() {
                return Ok(skills);
            }
        }
    }
    // Fallback to bundled JSON
    Ok(parse_and_filter(BUNDLED_JSON).unwrap_or_default())
}

fn fetch_from_url(url: &str, proxy_url: &str) -> Result<String> {
    let client = github_http_client(proxy_url, Some(15))?;

    let body = client
        .get(url)
        .header("User-Agent", "baocanmou-ai-skill-center")
        .send()
        .context("fetch featured skills")?
        .error_for_status()
        .context("featured skills HTTP error")?
        .text()
        .context("read featured skills body")?;

    Ok(body)
}

fn parse_and_filter(json_str: &str) -> Result<Vec<FeaturedSkill>> {
    let data: FeaturedSkillsData =
        serde_json::from_str(json_str).context("parse featured skills JSON")?;

    Ok(data
        .skills
        .into_iter()
        .filter(|s| !s.source_url.is_empty())
        .map(|s| {
            let recommendation_score = if s.recommendation_score > 0.0 {
                s.recommendation_score
            } else {
                s.popularity_score
            };
            let recommendation_tier = if s.recommendation_tier.is_empty() {
                match recommendation_score {
                    score if score >= 85.0 => "A".to_string(),
                    score if score >= 75.0 => "B".to_string(),
                    _ => "C".to_string(),
                }
            } else {
                s.recommendation_tier
            };
            FeaturedSkill {
                rank: s.rank,
                slug: s.slug,
                name: s.name,
                summary: s.summary,
                downloads: s.downloads,
                stars: s.stars,
                forks: s.forks,
                popularity_score: s.popularity_score,
                recommendation_score,
                recommendation_tier,
                recommendation_reasons: s.recommendation_reasons,
                review_flags: s.review_flags,
                license: s.license,
                official: s.official,
                source_url: s.source_url,
            }
        })
        .collect())
}

#[cfg(test)]
#[path = "tests/featured_skills.rs"]
mod tests;
