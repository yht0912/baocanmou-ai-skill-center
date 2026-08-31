import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeSkillsShEntries,
  parseSkillsShLeaderboardHtml,
  scoreAndRankSkills,
  selectWithRepositoryCap,
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
    { name: 'design-alpha', source: 'owner/design', installs: 1000, recentInstalls: 100, stars: 50, forks: 10, pushedAt: '2026-08-31T00:00:00Z', official: true, license: 'MIT', repositoryDescription: 'Design tools', topics: ['design'] },
    { name: 'beta', installs: 10, recentInstalls: 1, stars: 1, forks: 0, pushedAt: '2024-01-01T00:00:00Z', official: false },
  ], now)
  assert.equal(ranked[0].name, 'design-alpha')
  assert.equal(ranked[0].rank, 1)
  assert.equal(ranked[0].score, 100)
  assert.equal(ranked[0].popularityScore, 100)
  assert.equal(ranked[0].recommendationTier, 'A')
  assert.ok(ranked[0].recommendationReasons.includes('high-adoption'))
  assert.ok(ranked[1].score < ranked[0].score)
  assert.ok(ranked[1].reviewFlags.includes('license-unverified'))
})

test('limits repository concentration while preserving score order', () => {
  const selected = selectWithRepositoryCap([
    { name: 'a', source: 'owner/one', score: 100 },
    { name: 'b', source: 'owner/one', score: 99 },
    { name: 'c', source: 'owner/two', score: 98 },
    { name: 'd', source: 'owner/three', score: 97 },
  ], 3, 1)

  assert.deepEqual(selected.map((skill) => skill.name), ['a', 'c', 'd'])
  assert.deepEqual(selected.map((skill) => skill.rank), [1, 2, 3])
})
