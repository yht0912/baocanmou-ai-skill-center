import { describe, expect, it } from 'vitest'
import { catalogChineseName, catalogPurpose, categoryLabel, filterSkills, recommendationReason, scoreBand } from './appLogic'
import type { SkillAsset } from './contracts'

const skill: SkillAsset = {
  id: 'code-review',
  nameZh: '代码评审',
  nameEn: 'code-review',
  summaryZh: '检查代码质量',
  summaryEn: 'Review code quality',
  purposeZh: '用于检查代码质量。',
  purposeEn: 'Used to review code quality.',
  featuresZh: ['结构化评审'],
  featuresEn: ['Structured review'],
  category: 'development',
  path: '/tmp/code-review',
  score: 92,
  status: 'ready',
  riskLevel: 'low',
  riskFlags: [],
  fileCount: 2,
  contentHash: 'abc',
  modifiedAt: 0,
  translationMode: 'custom',
  previewKind: 'generated',
  connections: [],
}

describe('BaoCanMou application logic', () => {
  it('searches both Chinese and English fields', () => {
    expect(filterSkills([skill], '代码', 'all')).toHaveLength(1)
    expect(filterSkills([skill], 'review', 'all')).toHaveLength(1)
    expect(filterSkills([skill], 'video', 'all')).toHaveLength(0)
  })

  it('uses bilingual labels', () => {
    expect(categoryLabel('development', 'zh')).toBe('开发')
    expect(categoryLabel('development', 'en')).toBe('Development')
    expect(recommendationReason('high-adoption', 'zh')).toBe('采用量高')
  })

  it('maps score bands predictably', () => {
    expect(scoreBand(90)).toBe('strong')
    expect(scoreBand(75)).toBe('steady')
    expect(scoreBand(74)).toBe('attention')
  })

  it('adds Chinese understanding to external index entries', () => {
    const indexed = { name: 'example-skill', category: 'design' }
    expect(catalogChineseName(indexed)).toBe('设计能力 · example-skill')
    expect(catalogPurpose(indexed, 'zh')).toContain('视觉')
  })
})
