import { memo, useMemo, useState } from 'react'
import { BadgeCheck, Download, Flame, Plus, Search, Star } from 'lucide-react'
import type { TFunction } from 'i18next'
import { getSkillDisplayNames } from './skillDisplayName'
import type { FeaturedSkillDto, ManagedSkill, OnlineSkillDto } from './types'

type ExplorePageProps = {
  featuredSkills: FeaturedSkillDto[]
  featuredLoading: boolean
  exploreFilter: string
  searchResults: OnlineSkillDto[]
  searchLoading: boolean
  managedSkills: ManagedSkill[]
  loading: boolean
  onExploreFilterChange: (value: string) => void
  onInstallSkill: (sourceUrl: string, skillName?: string) => void
  onOpenManualAdd: (tab?: 'git' | 'local') => void
  t: TFunction
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

const ExplorePage = ({
  featuredSkills,
  featuredLoading,
  exploreFilter,
  searchResults,
  searchLoading,
  managedSkills,
  loading,
  onExploreFilterChange,
  onInstallSkill,
  onOpenManualAdd,
  t,
}: ExplorePageProps) => {
  const [popularitySort, setPopularitySort] = useState<'composite' | 'installs' | 'stars'>('composite')
  const [visibleCount, setVisibleCount] = useState(60)

  const filteredSkills = useMemo(() => {
    const lower = exploreFilter.trim().toLowerCase()
    const visible = lower
      ? featuredSkills.filter((s) => {
          const displayNames = getSkillDisplayNames(s.name, s.summary)
          return (
            s.name.toLowerCase().includes(lower) ||
            displayNames.primary.toLowerCase().includes(lower) ||
            s.summary.toLowerCase().includes(lower) ||
            s.source_url.toLowerCase().includes(lower)
          )
        })
      : [...featuredSkills]

    return visible.sort((left, right) => {
      if (popularitySort === 'installs') return right.downloads - left.downloads || left.rank - right.rank
      if (popularitySort === 'stars') return right.stars - left.stars || left.rank - right.rank
      return left.rank - right.rank
    })
  }, [featuredSkills, exploreFilter, popularitySort])

  const displayedSkills = useMemo(
    () => filteredSkills.slice(0, visibleCount),
    [filteredSkills, visibleCount],
  )

  const deduplicatedResults = useMemo(() => {
    const featuredNames = new Set(filteredSkills.map((s) => s.name.toLowerCase()))
    return searchResults.filter((s) => !featuredNames.has(s.name.toLowerCase()))
  }, [searchResults, filteredSkills])

  const isSearchActive = exploreFilter.trim().length >= 2

  // Check if a skill is already installed by matching name + source (case-insensitive)
  const installedSkillKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const skill of managedSkills) {
      const source = (skill.source_ref ?? '')
        .replace('https://github.com/', '')
        .replace(/\.git$/, '')
        .split('/tree/')[0]
        .toLowerCase()
      keys.add(`${skill.name.toLowerCase()}|${source}`)
    }
    return keys
  }, [managedSkills])

  const isInstalled = (skillName: string, source: string) => {
    const normalizedSource = source
      .replace('https://github.com/', '')
      .replace(/\.git$/, '')
      .split('/tree/')[0]
      .toLowerCase()
    return installedSkillKeys.has(`${skillName.toLowerCase()}|${normalizedSource}`)
  }

  return (
    <div className="explore-page">
      <div className="explore-tabs" role="tablist" aria-label={t('addSkills')}>
        <button className="active" type="button" role="tab" aria-selected="true">
          {t('exploreTabs.online')}
        </button>
        <button type="button" role="tab" aria-selected="false" onClick={() => onOpenManualAdd('git')}>
          {t('exploreTabs.git')}
        </button>
        <button type="button" role="tab" aria-selected="false" onClick={() => onOpenManualAdd('local')}>
          {t('exploreTabs.local')}
        </button>
      </div>
      <div className="explore-hero">
        <div className="explore-search-row">
          <div className="explore-search-wrap">
            <Search size={16} className="explore-search-icon" />
            <input
              className="explore-search-input"
              placeholder={t('exploreFilterPlaceholder')}
              value={exploreFilter}
              onChange={(e) => {
                setVisibleCount(60)
                onExploreFilterChange(e.target.value)
              }}
            />
          </div>
          <button
            className="btn btn-secondary explore-manual-btn"
            type="button"
            onClick={() => onOpenManualAdd('git')}
            disabled={loading}
          >
            <Plus size={15} />
            {t('manualAdd')}
          </button>
        </div>
        <div className="explore-source-label">
          {t('exploreSourceHint')}
        </div>
      </div>

      <div className="explore-scroll">
        {/* Featured section */}
        {featuredLoading ? (
          <div className="explore-loading">{t('exploreLoading')}</div>
        ) : (
          <>
            <div className="explore-section-heading">
              <div>
                <div className="explore-section-title">{t('exploreFeaturedTitle')}</div>
                <div className="explore-section-note">{t('popularityDisclaimer')}</div>
              </div>
              <div className="explore-sort" role="group" aria-label={t('popularitySortLabel')}>
                {(['composite', 'installs', 'stars'] as const).map((sort) => (
                  <button
                    key={sort}
                    type="button"
                    className={popularitySort === sort ? 'active' : ''}
                    aria-pressed={popularitySort === sort}
                    onClick={() => {
                      setVisibleCount(60)
                      setPopularitySort(sort)
                    }}
                  >
                    {t(`popularitySort.${sort}`)}
                  </button>
                ))}
              </div>
            </div>
            {filteredSkills.length > 0 ? (
              <div className="explore-grid">
                {displayedSkills.map((skill) => {
                  const installed = isInstalled(skill.name, skill.source_url)
                  const displayNames = getSkillDisplayNames(skill.name, skill.summary)
                  return (
                    <div key={skill.slug} className="explore-card">
                      <div className="explore-card-top">
                        <span className="explore-rank" aria-label={t('popularityRank', { rank: skill.rank })}>
                          #{skill.rank}
                        </span>
                        <div className="explore-card-info">
                          <div className="explore-card-name">
                            <strong>{displayNames.primary}</strong>
                            {displayNames.secondary ? <small>{displayNames.secondary}</small> : null}
                          </div>
                          <div className="explore-card-author">
                            {skill.source_url
                              .replace('https://github.com/', '')
                              .split('/tree/')[0]}
                            {skill.official ? (
                              <span className="explore-official" title={t('popularityOfficial')}>
                                <BadgeCheck size={12} />
                                {t('popularityOfficial')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {installed ? (
                          <span className="explore-btn-installed">
                            {t('status.installed')}
                          </span>
                        ) : (
                          <button
                            className="explore-btn-install"
                            type="button"
                            disabled={loading}
                            onClick={() => onInstallSkill(skill.source_url, skill.name)}
                          >
                            {t('install')}
                          </button>
                        )}
                      </div>
                      <div className="explore-card-desc">
                        {skill.summary || t('popularitySkillSummary')}
                      </div>
                      <div className="explore-card-bottom">
                        <div className="explore-card-stats">
                          <span className="explore-stat">
                            <Download size={12} />
                            {formatCount(skill.downloads)}
                          </span>
                          <span className="explore-stat">
                            <Star size={12} />
                            {formatCount(skill.stars)}
                          </span>
                          <span className="explore-stat explore-stat-score">
                            <Flame size={12} />
                            {skill.popularity_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !isSearchActive ? (
              <div className="explore-empty">{t('exploreEmpty')}</div>
            ) : null}

            {filteredSkills.length > displayedSkills.length ? (
              <div className="explore-more-wrap">
                <button
                  className="explore-more-btn"
                  type="button"
                  onClick={() => setVisibleCount((count) => count + 60)}
                >
                  {t('showMoreSkills', { count: filteredSkills.length - displayedSkills.length })}
                </button>
              </div>
            ) : null}

            {/* Online search results */}
            {isSearchActive && (
              <>
                <div className="explore-section-title">{t('exploreOnlineTitle')}</div>
                {searchLoading ? (
                  <div className="explore-loading">{t('searchLoading')}</div>
                ) : deduplicatedResults.length > 0 ? (
                  <div className="explore-grid">
                    {deduplicatedResults.map((skill) => {
                      const installed = isInstalled(skill.name, skill.source_url)
                      const displayNames = getSkillDisplayNames(skill.name)
                      return (
                        <div key={skill.source} className="explore-card">
                          <div className="explore-card-top">
                            <div className="explore-card-info">
                              <div className="explore-card-name">
                                <strong>{displayNames.primary}</strong>
                                {displayNames.secondary ? <small>{displayNames.secondary}</small> : null}
                              </div>
                              <div className="explore-card-author">{skill.source}</div>
                            </div>
                            {installed ? (
                              <span className="explore-btn-installed">
                                {t('status.installed')}
                              </span>
                            ) : (
                              <button
                                className="explore-btn-install"
                                type="button"
                                disabled={loading}
                                onClick={() => onInstallSkill(skill.source_url, skill.name)}
                              >
                                {t('install')}
                              </button>
                            )}
                          </div>
                          <div className="explore-card-bottom">
                            <div className="explore-card-stats">
                              <span className="explore-stat">
                                <Download size={12} />
                                {t('popularityInstalls', { value: formatCount(skill.installs) })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="explore-empty">{t('searchEmpty')}</div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default memo(ExplorePage)
