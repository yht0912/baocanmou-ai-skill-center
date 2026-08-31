#!/usr/bin/env node

/**
 * Build BaoCanMou's popular-skill baseline from public, auditable signals.
 *
 * Primary signal: anonymous install telemetry published by skills.sh.
 * Secondary signals: GitHub stars, forks, repository freshness, and official status.
 *
 * Popularity is not a security or quality guarantee. The generated list is a
 * discovery index only; users still choose what to inspect and install.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUTPUT_FILE = 'featured-skills.json'
const SKILLS_SH_URL = 'https://skills.sh/'
const MAX_SKILLS = 300
const CONCURRENCY = 8
const MAX_RATE_LIMIT_WAIT_SECS = 60
const GITHUB_SOURCE_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

const SCORE_WEIGHTS = Object.freeze({
  installs: 0.55,
  recentInstalls: 0.2,
  stars: 0.12,
  forks: 0.05,
  freshness: 0.05,
  official: 0.03,
})

const CATEGORY_RULES = [
  { keywords: ['browser', 'playwright', 'puppeteer'], category: 'browser-automation' },
  { keywords: ['security', 'audit', 'vulnerability', 'pentest'], category: 'security' },
  { keywords: ['devops', 'deploy', 'infra', 'docker', 'kubernetes'], category: 'devops' },
  { keywords: ['marketing', 'seo', 'ads', 'advertising'], category: 'marketing' },
  { keywords: ['database', 'sql', 'postgres', 'mongo'], category: 'database' },
  { keywords: ['git', 'github', 'review', 'code'], category: 'development' },
  { keywords: ['design', 'figma', 'frontend', 'ui', 'ux'], category: 'design' },
  { keywords: ['ai', 'llm', 'agent', 'model'], category: 'ai-assistant' },
]

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

export function scoreAndRankSkills(skills, now = Date.now()) {
  const maxInstalls = Math.max(0, ...skills.map((skill) => skill.installs))
  const maxRecent = Math.max(0, ...skills.map((skill) => skill.recentInstalls))
  const maxStars = Math.max(0, ...skills.map((skill) => skill.stars))
  const maxForks = Math.max(0, ...skills.map((skill) => skill.forks))

  return skills
    .map((skill) => {
      const weighted =
        SCORE_WEIGHTS.installs * logRatio(skill.installs, maxInstalls) +
        SCORE_WEIGHTS.recentInstalls * logRatio(skill.recentInstalls, maxRecent) +
        SCORE_WEIGHTS.stars * logRatio(skill.stars, maxStars) +
        SCORE_WEIGHTS.forks * logRatio(skill.forks, maxForks) +
        SCORE_WEIGHTS.freshness * freshnessRatio(skill.pushedAt, now) +
        SCORE_WEIGHTS.official * (skill.official ? 1 : 0)

      return { ...skill, score: Math.round(weighted * 1000) / 10 }
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.installs - left.installs ||
        left.name.localeCompare(right.name),
    )
    .map((skill, index) => ({ ...skill, rank: index + 1 }))
}

function classify(name, source) {
  const text = `${name} ${source}`.toLowerCase()
  return CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
    ?.category || 'general'
}

function readExistingRepoMetadata() {
  if (!existsSync(OUTPUT_FILE)) return new Map()
  try {
    const data = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    const result = new Map()
    for (const skill of data.skills || []) {
      const source = skill.source || String(skill.source_url || '')
        .replace('https://github.com/', '')
        .split('/tree/')[0]
      if (!GITHUB_SOURCE_PATTERN.test(source) || result.has(source)) continue
      result.set(source, {
        stargazers_count: Number(skill.stars) || 0,
        forks_count: Number(skill.forks) || 0,
        pushed_at: skill.updated_at || null,
        archived: false,
        disabled: false,
      })
    }
    return result
  } catch {
    return new Map()
  }
}

async function main() {
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
        archived: Boolean(repo?.archived || repo?.disabled),
      }
    })
    .filter((skill) => !skill.archived)

  const ranked = scoreAndRankSkills(enriched).slice(0, MAX_SKILLS)
  const categories = new Set()
  const skills = ranked.map((skill) => {
    const category = classify(skill.name, skill.source)
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
      popularity_score: skill.score,
      official: skill.official,
      category,
      source: skill.source,
      source_url: `https://github.com/${skill.source}`,
      skills_sh_url: `https://skills.sh/${skill.source}/${skill.skillId}`,
      updated_at: skill.pushedAt,
    }
  })

  const output = {
    schema_version: 2,
    updated_at: new Date().toISOString(),
    total: skills.length,
    methodology: {
      name: 'baocanmou-popularity-v1',
      note_zh: '综合热度仅用于发现，不代表安全、质量或官方推荐。',
      note_en: 'Popularity supports discovery; it is not a security, quality, or endorsement rating.',
      sources: ['https://skills.sh/', 'https://api.github.com/'],
      weights: SCORE_WEIGHTS,
    },
    categories: [...categories].sort(),
    skills,
  }

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${skills.length} ranked skills to ${OUTPUT_FILE}`)
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isDirectRun) {
  main().catch((error) => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
