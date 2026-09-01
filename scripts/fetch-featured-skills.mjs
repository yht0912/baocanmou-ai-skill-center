#!/usr/bin/env node

/**
 * Build BaoCanMou's popular-skill baseline from public, auditable signals.
 *
 * Primary signal: anonymous install telemetry published by skills.sh.
 * Secondary signals: GitHub stars, forks, repository freshness, official status,
 * licensing clarity, documentation signals, and BaoCanMou strategic relevance.
 *
 * Popularity is not a security or quality guarantee. The generated list is a
 * discovery index only; users still choose what to inspect and install.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUTPUT_FILE = 'featured-skills.json'
const DIGEST_ZH_FILE = 'docs/热门能力情报.md'
const DIGEST_EN_FILE = 'docs/Capability-Intelligence-Digest.en.md'
const SKILLS_SH_URL = 'https://skills.sh/'
const MAX_SKILLS = 300
const MAX_SKILLS_PER_REPOSITORY = 20
const CONCURRENCY = 8
const MAX_RATE_LIMIT_WAIT_SECS = 60
const GITHUB_SOURCE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

const POPULARITY_WEIGHTS = Object.freeze({
  installs: 0.55,
  recentInstalls: 0.2,
  stars: 0.12,
  forks: 0.05,
  freshness: 0.05,
  official: 0.03,
})

const RECOMMENDATION_WEIGHTS = Object.freeze({
  installs: 0.3,
  recentInstalls: 0.2,
  stars: 0.1,
  forks: 0.04,
  freshness: 0.12,
  official: 0.04,
  licenseClarity: 0.08,
  documentation: 0.04,
  baocanmouFit: 0.08,
})

const CATEGORY_RULES = [
  { keywords: ['ppt', 'presentation', 'slides', 'deck'], category: 'presentation' },
  { keywords: ['video', 'remotion', 'motion', 'animation'], category: 'video' },
  { keywords: ['chart', 'dashboard', 'analytics', 'visualization', 'csv', 'excel'], category: 'data-visualization' },
  { keywords: ['content', 'copywriting', 'writing', 'editorial'], category: 'content' },
  { keywords: ['research', 'paper', 'citation', 'literature'], category: 'research' },
  { keywords: ['productivity', 'workflow', 'automation'], category: 'productivity' },
  { keywords: ['browser', 'playwright', 'puppeteer'], category: 'browser-automation' },
  { keywords: ['security', 'audit', 'vulnerability', 'pentest'], category: 'security' },
  { keywords: ['devops', 'deploy', 'infra', 'docker', 'kubernetes'], category: 'devops' },
  { keywords: ['marketing', 'seo', 'ads', 'advertising'], category: 'marketing' },
  { keywords: ['database', 'sql', 'postgres', 'mongo'], category: 'database' },
  { keywords: ['git', 'github', 'review', 'code'], category: 'development' },
  { keywords: ['design', 'figma', 'frontend', 'ui', 'ux'], category: 'design' },
  { keywords: ['ai', 'llm', 'agent', 'model'], category: 'ai-assistant' },
]

const CATEGORY_FIT = Object.freeze({
  presentation: 1,
  video: 1,
  design: 1,
  marketing: 1,
  content: 0.95,
  'browser-automation': 0.95,
  'data-visualization': 0.95,
  development: 0.9,
  'ai-assistant': 0.9,
  productivity: 0.9,
  security: 0.85,
  research: 0.8,
  devops: 0.75,
  database: 0.75,
  general: 0.55,
})

const REASON_LABELS = Object.freeze({
  'high-adoption': { zh: '累计安装量高', en: 'High adoption' },
  'fast-momentum': { zh: '近期增长快', en: 'Fast recent growth' },
  'community-recognition': { zh: '社区认可度高', en: 'Strong community recognition' },
  'actively-maintained': { zh: '持续维护', en: 'Actively maintained' },
  'official-source': { zh: '官方来源', en: 'Official source' },
  'clear-license': { zh: '许可证明确', en: 'Clear repository license' },
  'baocanmou-fit': { zh: '契合包参谋能力方向', en: 'Strong BaoCanMou fit' },
})

function loadLocalEnv() {
  const envPath = resolve(import.meta.dirname, '..', '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function pMap(items, fn, concurrency = CONCURRENCY) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index++
      results[current] = await fn(items[current], current)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

async function fetchText(url, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'baocanmou-ai-skill-center/0.1',
      },
    })
    if (response.ok) return response.text()
    if (attempt < retries) await sleep(2 ** attempt * 1000)
  }
  return null
}

async function fetchGithubRepo(source, retries = 2) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'baocanmou-ai-skill-center/0.1',
  }
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`

  const url = `https://api.github.com/repos/${source}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, { headers })
    if (response.ok) return response.json()
    if (response.status === 404) return null
    if (response.status === 403 || response.status === 429) {
      const resetAt = Number(response.headers.get('x-ratelimit-reset') || 0)
      const waitSecs = resetAt
        ? Math.max(resetAt - Math.floor(Date.now() / 1000), 1)
        : 2 ** (attempt + 1)
      if (waitSecs > MAX_RATE_LIMIT_WAIT_SECS) {
        console.warn(`  GitHub rate limit for ${source}; using cached/empty metadata`)
        return null
      }
      await sleep(waitSecs * 1000)
      continue
    }
    if (attempt < retries) await sleep(2 ** attempt * 1000)
  }
  return null
}

/**
 * Extract the server-rendered initialSkills array without executing page code.
 * Next.js serializes quotes as \" inside its RSC payload, so the array is
 * decoded after a balanced-bracket scan.
 */
export function parseSkillsShLeaderboardHtml(html) {
  const markerIndex = html.indexOf('initialSkills')
  if (markerIndex === -1) throw new Error('skills.sh initialSkills payload not found')

  const arrayStart = html.indexOf('[', markerIndex)
  if (arrayStart === -1) throw new Error('skills.sh initialSkills array start not found')

  let depth = 0
  let arrayEnd = -1
  for (let index = arrayStart; index < html.length; index++) {
    if (html[index] === '[') depth++
    if (html[index] === ']' && --depth === 0) {
      arrayEnd = index
      break
    }
  }
  if (arrayEnd === -1) throw new Error('skills.sh initialSkills array end not found')

  const escapedQuote = `${String.fromCharCode(92)}"`
  const decoded = html.slice(arrayStart, arrayEnd + 1).split(escapedQuote).join('"')
  const parsed = JSON.parse(decoded)
  if (!Array.isArray(parsed)) throw new Error('skills.sh initialSkills payload is not an array')
  return parsed
}

function sumRecentInstalls(values) {
  if (!Array.isArray(values)) return 0
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0)
}

export function normalizeSkillsShEntries(entries) {
  const seen = new Set()
  return entries
    .filter((entry) => entry && GITHUB_SOURCE_PATTERN.test(String(entry.source || '')))
    .map((entry) => ({
      source: String(entry.source),
      skillId: String(entry.skillId || entry.name || '').trim(),
      name: String(entry.name || entry.skillId || '').trim(),
      installs: Math.max(0, Number(entry.installs) || 0),
      recentInstalls: sumRecentInstalls(entry.weeklyInstalls),
      official: Boolean(entry.isOfficial),
    }))
    .filter((entry) => {
      if (!entry.skillId || !entry.name) return false
      const key = `${entry.source.toLowerCase()}#${entry.skillId.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function logRatio(value, maxValue) {
  if (maxValue <= 0) return 0
  return Math.log10(Math.max(0, value) + 1) / Math.log10(maxValue + 1)
}

function freshnessRatio(pushedAt, now = Date.now()) {
  if (!pushedAt) return 0
  const timestamp = Date.parse(pushedAt)
  if (!Number.isFinite(timestamp)) return 0
  const ageDays = Math.max(0, (now - timestamp) / 86_400_000)
  return Math.max(0, 1 - ageDays / 730)
}

function hasClearLicense(license) {
  const spdx = String(license || '').trim().toUpperCase()
  return Boolean(spdx && spdx !== 'NOASSERTION' && spdx !== 'OTHER')
}

function documentationRatio(skill) {
  const hasDescription = Boolean(String(skill.repositoryDescription || '').trim())
  const hasTopics = Array.isArray(skill.topics) && skill.topics.length > 0
  return (hasDescription ? 0.6 : 0) + (hasTopics ? 0.4 : 0)
}

function baocanmouFitRatio(category) {
  return CATEGORY_FIT[category] ?? CATEGORY_FIT.general
}

function roundScore(value) {
  return Math.round(value * 1000) / 10
}

function recommendationTier(score) {
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  return 'C'
}

function recommendationReasons(ratios, skill) {
  const reasons = []
  if (ratios.installs >= 0.72) reasons.push('high-adoption')
  if (ratios.recentInstalls >= 0.68) reasons.push('fast-momentum')
  if (ratios.freshness >= 0.72) reasons.push('actively-maintained')
  const differentiators = [
    [skill.official, 'official-source'],
    [ratios.baocanmouFit >= 0.95, 'baocanmou-fit'],
    [ratios.licenseClarity === 1, 'clear-license'],
    [ratios.stars >= 0.7, 'community-recognition'],
  ]
  for (const [matches, reason] of differentiators) {
    if (matches && reasons.length < 4) reasons.push(reason)
  }

  if (reasons.length === 0) {
    const strongest = [
      ['high-adoption', ratios.installs],
      ['fast-momentum', ratios.recentInstalls],
      ['community-recognition', ratios.stars],
      ['actively-maintained', ratios.freshness],
      ['baocanmou-fit', ratios.baocanmouFit],
    ].sort((left, right) => right[1] - left[1])[0]
    reasons.push(strongest[0])
  }
  return reasons.slice(0, 4)
}

function reviewFlags(ratios, skill) {
  const flags = []
  if (ratios.licenseClarity === 0) flags.push('license-unverified')
  if (ratios.freshness < 0.15) flags.push('stale-repository')
  if (!String(skill.repositoryDescription || '').trim()) flags.push('limited-repository-metadata')
  return flags
}

export function scoreAndRankSkills(skills, now = Date.now()) {
  const maxInstalls = Math.max(0, ...skills.map((skill) => skill.installs))
  const maxRecent = Math.max(0, ...skills.map((skill) => skill.recentInstalls))
  const maxStars = Math.max(0, ...skills.map((skill) => skill.stars))
  const maxForks = Math.max(0, ...skills.map((skill) => skill.forks))

  return skills
    .map((skill) => {
      const category = skill.category || classify(
        skill.name,
        skill.source,
        skill.repositoryDescription,
        skill.topics,
      )
      const ratios = {
        installs: logRatio(skill.installs, maxInstalls),
        recentInstalls: logRatio(skill.recentInstalls, maxRecent),
        stars: logRatio(skill.stars, maxStars),
        forks: logRatio(skill.forks, maxForks),
        freshness: freshnessRatio(skill.pushedAt, now),
        official: skill.official ? 1 : 0,
        licenseClarity: hasClearLicense(skill.license) ? 1 : 0,
        documentation: documentationRatio(skill),
        baocanmouFit: baocanmouFitRatio(category),
      }
      const popularityWeighted = Object.entries(POPULARITY_WEIGHTS)
        .reduce((sum, [key, weight]) => sum + weight * ratios[key], 0)
      const recommendationWeighted = Object.entries(RECOMMENDATION_WEIGHTS)
        .reduce((sum, [key, weight]) => sum + weight * ratios[key], 0)
      const popularityScore = roundScore(popularityWeighted)
      const recommendationScore = roundScore(recommendationWeighted)

      return {
        ...skill,
        category,
        score: recommendationScore,
        popularityScore,
        recommendationScore,
        recommendationTier: recommendationTier(recommendationScore),
        recommendationReasons: recommendationReasons(ratios, skill),
        reviewFlags: reviewFlags(ratios, skill),
      }
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.installs - left.installs ||
        left.name.localeCompare(right.name),
    )
    .map((skill, index) => ({ ...skill, rank: index + 1 }))
}

function classify(name, source, description = '', topics = []) {
  const text = `${name} ${source} ${description} ${Array.isArray(topics) ? topics.join(' ') : ''}`.toLowerCase()
  return CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
    ?.category || 'general'
}

export function selectWithRepositoryCap(rankedSkills, limit = MAX_SKILLS, cap = MAX_SKILLS_PER_REPOSITORY) {
  const selected = []
  const sourceCounts = new Map()
  for (const skill of rankedSkills) {
    const source = String(skill.source || '').toLowerCase()
    const count = sourceCounts.get(source) || 0
    if (count >= cap) continue
    selected.push(skill)
    sourceCounts.set(source, count + 1)
    if (selected.length === limit) break
  }
  return selected.map((skill, index) => ({ ...skill, rank: index + 1 }))
}

function readExistingRepoMetadata() {
  if (!existsSync(OUTPUT_FILE)) return new Map()
  try {
    const data = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    const result = new Map()
    for (const [source, repo] of Object.entries(data.repositories || {})) {
      if (!GITHUB_SOURCE_PATTERN.test(source) || !repo || typeof repo !== 'object') continue
      result.set(source, {
        stargazers_count: Number(repo.stars) || 0,
        forks_count: Number(repo.forks) || 0,
        pushed_at: repo.pushed_at || null,
        created_at: repo.created_at || null,
        description: repo.description || null,
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        license: repo.license ? { spdx_id: repo.license } : null,
        open_issues_count: Number(repo.open_issues) || 0,
        archived: Boolean(repo.archived),
        disabled: Boolean(repo.disabled),
      })
    }
    for (const skill of data.skills || []) {
      const source = skill.source || String(skill.source_url || '')
        .replace('https://github.com/', '')
        .split('/tree/')[0]
      if (!GITHUB_SOURCE_PATTERN.test(source) || result.has(source)) continue
      result.set(source, {
        stargazers_count: Number(skill.stars) || 0,
        forks_count: Number(skill.forks) || 0,
        pushed_at: skill.updated_at || null,
        created_at: skill.created_at || null,
        description: skill.repository_description || null,
        topics: Array.isArray(skill.topics) ? skill.topics : [],
        license: skill.license ? { spdx_id: skill.license } : null,
        open_issues_count: Number(skill.open_issues) || 0,
        archived: false,
        disabled: false,
      })
    }
    return result
  } catch {
    return new Map()
  }
}

function readExistingOutput() {
  if (!existsSync(OUTPUT_FILE)) return null
  try {
    return JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
  } catch {
    return null
  }
}

function stableSnapshot(value) {
  if (!value || typeof value !== 'object') return value
  const copy = structuredClone(value)
  delete copy.updated_at
  return copy
}

function snapshotsEqual(left, right) {
  return JSON.stringify(stableSnapshot(left)) === JSON.stringify(stableSnapshot(right))
}

function writeIfChanged(file, content) {
  if (existsSync(file) && readFileSync(file, 'utf-8') === content) return false
  writeFileSync(file, content)
  return true
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function escapeMarkdown(value) {
  return String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function movementLabel(skill, previousRanks, language) {
  const previous = previousRanks.get(skill.slug)
  if (!previous) return language === 'zh' ? '新入榜' : 'New'
  const delta = previous - skill.rank
  if (delta === 0) return '—'
  return delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`
}

function renderDigest(output, previousOutput, language) {
  const zh = language === 'zh'
  const previousRanks = new Map((previousOutput?.skills || []).map((skill) => [skill.slug, skill.rank]))
  const title = zh ? '# 包参谋能力情报摘要' : '# BaoCanMou Capability Intelligence Digest'
  const intro = zh
    ? '本页由公开数据定期生成，展示包参谋推荐榜前 30 名及其主要入选理由。推荐分用于筛选，不是安全认证；任何第三方 Skill 安装前仍需人工查看源码、依赖和权限。'
    : 'This page is generated periodically from public data. It shows the top 30 BaoCanMou recommendations and the main selection reasons. The recommendation score is a discovery filter, not a security certification; inspect source, dependencies, and permissions before installation.'
  const headers = zh
    ? '| 排名 | 技能 | 来源 | 安装量 | Stars | 推荐分 | 变化 | 入选理由 |\n| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |'
    : '| Rank | Skill | Source | Installs | Stars | Score | Move | Why selected |\n| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |'
  const rows = output.skills.slice(0, 30).map((skill) => {
    const reasons = skill.recommendation_reasons
      .map((reason) => REASON_LABELS[reason]?.[language] || reason)
      .join(zh ? '、' : ', ')
    return `| ${skill.rank} | [${escapeMarkdown(skill.name)}](${skill.skills_sh_url}) | ${escapeMarkdown(skill.source)} | ${formatInteger(skill.downloads)} | ${formatInteger(skill.stars)} | ${skill.recommendation_score.toFixed(1)} | ${movementLabel(skill, previousRanks, language)} | ${escapeMarkdown(reasons)} |`
  }).join('\n')
  const details = zh
    ? `- 更新时间：${output.updated_at}\n- 榜单规模：${output.total}\n- 单仓库最多入选：${MAX_SKILLS_PER_REPOSITORY}\n- 数据源：skills.sh、GitHub REST API\n- 包参谋：<https://www.bcmsj.com> · 开源交流学习使用`
    : `- Updated: ${output.updated_at}\n- Catalog size: ${output.total}\n- Maximum entries per repository: ${MAX_SKILLS_PER_REPOSITORY}\n- Sources: skills.sh and GitHub REST API\n- BaoCanMou: <https://www.bcmsj.com> · Open source for exchange and learning`
  return `${title}\n\n> ${intro}\n\n${details}\n\n${headers}\n${rows}\n`
}

async function main() {
  const existingOutput = readExistingOutput()
  console.log('Fetching the public skills.sh all-time leaderboard...')
  const html = await fetchText(SKILLS_SH_URL)
  if (!html) throw new Error('unable to fetch skills.sh leaderboard')

  const leaderboard = normalizeSkillsShEntries(parseSkillsShLeaderboardHtml(html))
  if (leaderboard.length < MAX_SKILLS) {
    throw new Error(`only ${leaderboard.length} GitHub-backed skills found; refusing partial update`)
  }
  console.log(`Found ${leaderboard.length} unique GitHub-backed skills`)

  const candidateSkills = leaderboard.slice(0, Math.max(MAX_SKILLS * 2, MAX_SKILLS))
  const sources = [...new Set(candidateSkills.map((skill) => skill.source))]
  const cachedMetadata = readExistingRepoMetadata()
  console.log(`Enriching ${sources.length} GitHub repositories${GITHUB_TOKEN ? '' : ' (unauthenticated)'}...`)

  const metadataResults = await pMap(sources, async (source) => {
    const live = await fetchGithubRepo(source)
    return [source, live || cachedMetadata.get(source) || null]
  })
  const metadata = new Map(metadataResults)

  const enriched = candidateSkills
    .map((skill) => {
      const repo = metadata.get(skill.source)
      return {
        ...skill,
        stars: Number(repo?.stargazers_count) || 0,
        forks: Number(repo?.forks_count) || 0,
        pushedAt: repo?.pushed_at || null,
        createdAt: repo?.created_at || null,
        repositoryDescription: repo?.description || '',
        topics: Array.isArray(repo?.topics) ? repo.topics : [],
        license: repo?.license?.spdx_id || '',
        openIssues: Number(repo?.open_issues_count) || 0,
        archived: Boolean(repo?.archived || repo?.disabled),
      }
    })
    .filter((skill) => !skill.archived)

  const ranked = selectWithRepositoryCap(scoreAndRankSkills(enriched))
  const categories = new Set()
  const skills = ranked.map((skill) => {
    const category = skill.category
    categories.add(category)
    return {
      rank: skill.rank,
      slug: `${skill.source.replace('/', '--')}--${skill.skillId}`.toLowerCase(),
      name: skill.name,
      summary: '',
      downloads: skill.installs,
      recent_downloads: skill.recentInstalls,
      stars: skill.stars,
      forks: skill.forks,
      popularity_score: skill.popularityScore,
      recommendation_score: skill.recommendationScore,
      recommendation_tier: skill.recommendationTier,
      recommendation_reasons: skill.recommendationReasons,
      review_flags: skill.reviewFlags,
      official: skill.official,
      category,
      source: skill.source,
      source_url: `https://github.com/${skill.source}`,
      skills_sh_url: `https://skills.sh/${skill.source}/${skill.skillId}`,
      updated_at: skill.pushedAt,
      license: skill.license,
    }
  })

  const repositories = Object.fromEntries(
    [...metadata.entries()]
      .filter(([, repo]) => repo)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([source, repo]) => [source, {
        stars: Number(repo.stargazers_count) || 0,
        forks: Number(repo.forks_count) || 0,
        pushed_at: repo.pushed_at || null,
        created_at: repo.created_at || null,
        description: repo.description || '',
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        license: repo.license?.spdx_id || '',
        open_issues: Number(repo.open_issues_count) || 0,
        archived: Boolean(repo.archived),
        disabled: Boolean(repo.disabled),
      }]),
  )

  const output = {
    schema_version: 3,
    updated_at: new Date().toISOString(),
    total: skills.length,
    methodology: {
      name: 'baocanmou-capability-intelligence-v3',
      note_zh: '包参谋推荐分综合公开热度、维护、许可证清晰度和能力方向，仅用于发现，不代表安全认证。',
      note_en: 'The BaoCanMou recommendation score combines public adoption, maintenance, licensing clarity, and capability fit for discovery only; it is not a security certification.',
      sources: ['https://skills.sh/', 'https://api.github.com/'],
      popularity_weights: POPULARITY_WEIGHTS,
      recommendation_weights: RECOMMENDATION_WEIGHTS,
      selection_rules: {
        maximum_skills: MAX_SKILLS,
        maximum_skills_per_repository: MAX_SKILLS_PER_REPOSITORY,
        archived_or_disabled_repositories: 'excluded',
        installation_policy: 'manual-review-only',
      },
    },
    categories: [...categories].sort(),
    repositories,
    skills,
  }

  if (snapshotsEqual(existingOutput, output)) {
    console.log('No meaningful ranking or metadata change; keeping the existing snapshot timestamp')
    if (!existsSync(DIGEST_ZH_FILE)) writeIfChanged(DIGEST_ZH_FILE, renderDigest(existingOutput, null, 'zh'))
    if (!existsSync(DIGEST_EN_FILE)) writeIfChanged(DIGEST_EN_FILE, renderDigest(existingOutput, null, 'en'))
    return
  }

  writeIfChanged(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`)
  writeIfChanged(DIGEST_ZH_FILE, renderDigest(output, existingOutput, 'zh'))
  writeIfChanged(DIGEST_EN_FILE, renderDigest(output, existingOutput, 'en'))
  console.log(`Wrote ${skills.length} ranked skills and bilingual digests`)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  main().catch((error) => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
