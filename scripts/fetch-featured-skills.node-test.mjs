import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeSkillsShEntries,
  parseSkillsShLeaderboardHtml,
  scoreAndRankSkills,
} from './fetch-featured-skills.mjs'

test('parses escaped skills.sh server payload', () => {
  const html = String.raw`prefix initialSkills\":[{\"source\":\"owner/repo\",\"skillId\":\"alpha\",\"name\":\"alpha\",\"installs\":120,\"weeklyInstalls\":[3,4],\"isOfficial\":true}] suffix`
  const result = parseSkillsShLeaderboardHtml(html)
  assert.equal(result.length, 1)
  assert.equal(result[0].source, 'owner/repo')
  assert.equal(result[0].installs, 120)
})

test('keeps GitHub sources, deduplicates exact skills, and sums recent installs', () => {
  const result = normalizeSkillsShEntries([
    { source: 'owner/repo', skillId: 'alpha', name: 'alpha', installs: 20, weeklyInstalls: [2, 3] },
    { source: 'owner/repo', skillId: 'alpha', name: 'alpha-copy', installs: 18 },
    { source: 'example.com', skillId: 'remote', name: 'remote', installs: 99 },
  ])
  assert.deepEqual(result, [{
    source: 'owner/repo',
    skillId: 'alpha',
    name: 'alpha',
    installs: 20,
    recentInstalls: 5,
    official: false,
  }])
})

test('computes deterministic composite scores and ranks strongest signal first', () => {
  const now = Date.parse('2026-08-31T00:00:00Z')
  const ranked = scoreAndRankSkills([
    { name: 'alpha', installs: 1000, recentInstalls: 100, stars: 50, forks: 10, pushedAt: '2026-08-30T00:00:00Z', official: true },
    { name: 'beta', installs: 10, recentInstalls: 1, stars: 1, forks: 0, pushedAt: '2024-01-01T00:00:00Z', official: false },
  ], now)
  assert.equal(ranked[0].name, 'alpha')
  assert.equal(ranked[0].rank, 1)
  assert.equal(ranked[0].score, 100)
  assert.ok(ranked[1].score < ranked[0].score)
})
