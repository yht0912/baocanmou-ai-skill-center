import type { FeaturedSkillDto } from './types'

export function getRecommendationReasons(skill: FeaturedSkillDto): string[] {
  return Array.isArray(skill.recommendation_reasons) ? skill.recommendation_reasons : []
}

export function getRecommendationScore(skill: FeaturedSkillDto): number {
  return Number.isFinite(skill.recommendation_score)
    ? Number(skill.recommendation_score)
    : skill.popularity_score
}

export function getRecommendationTier(skill: FeaturedSkillDto): string {
  if (skill.recommendation_tier) return skill.recommendation_tier
  const score = getRecommendationScore(skill)
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  return 'C'
}
