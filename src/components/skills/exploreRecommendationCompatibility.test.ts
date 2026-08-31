import { describe, expect, it } from 'vitest'
import {
  getRecommendationReasons,
  getRecommendationScore,
  getRecommendationTier,
} from './exploreRecommendation'
import type { FeaturedSkillDto } from './types'

function featured(overrides: Partial<FeaturedSkillDto> = {}): FeaturedSkillDto {
  return {
    rank: 1,
    slug: 'owner--repo--skill',
    name: 'skill',
    summary: '',
    downloads: 100,
    stars: 20,
    forks: 2,
    popularity_score: 82.4,
    official: false,
    source_url: 'https://github.com/owner/repo',
    ...overrides,
  }
}

describe('Explore recommendation compatibility', () => {
  it('falls back safely when a cached v2 catalog has no recommendation fields', () => {
    const skill = featured()
    expect(getRecommendationReasons(skill)).toEqual([])
    expect(getRecommendationScore(skill)).toBe(82.4)
    expect(getRecommendationTier(skill)).toBe('B')
  })

  it('uses schema v3 recommendation fields when present', () => {
    const skill = featured({
      recommendation_score: 91.3,
      recommendation_tier: 'A',
      recommendation_reasons: ['high-adoption', 'actively-maintained'],
    })
    expect(getRecommendationReasons(skill)).toEqual(['high-adoption', 'actively-maintained'])
    expect(getRecommendationScore(skill)).toBe(91.3)
    expect(getRecommendationTier(skill)).toBe('A')
  })
})
