import type { TFunction } from 'i18next'

type StrategicCommandBoardProps = {
  managedCount: number
  globalCount: number
  projectCount: number
  toolCount: number
  storagePath: string
  syncStatus: {
    className: string
    label: string
  }
  issueCount: number
  onAddSkill: () => void
  onOpenGovernance: () => void
  t: TFunction
}

const StrategicCommandBoard = ({
  managedCount,
  globalCount,
  projectCount,
  toolCount,
  storagePath,
  syncStatus,
  issueCount,
  onAddSkill,
  onOpenGovernance,
  t,
}: StrategicCommandBoardProps) => {
  const compactStoragePath = storagePath.replace(/^\/Users\/[^/]+/, '~')

  return <section className="asset-overview" aria-labelledby="asset-overview-title">
    <div className="asset-overview-main">
      <div className="asset-overview-copy">
        <h1 id="asset-overview-title">{t('navMySkills')}</h1>
        <p>{t('commandBoard.assetSummary', { managed: managedCount, tools: toolCount })}</p>
      </div>
      <button className="asset-add-button" type="button" onClick={onAddSkill}>
        <span aria-hidden="true">＋</span>
        {t('commandBoard.addAction')}
      </button>
    </div>

    <div className="asset-overview-meta">
      <div className="asset-counts" role="list" aria-label={t('commandBoard.assetBreakdown')}>
        <span role="listitem"><strong>{globalCount}</strong>{t('stats.global')}</span>
        <span role="listitem"><strong>{projectCount}</strong>{t('stats.project')}</span>
        <button
          className={`asset-health ${syncStatus.className}`}
          type="button"
          onClick={onOpenGovernance}
          disabled={issueCount === 0}
        >
          <i aria-hidden="true" />
          {syncStatus.label}
        </button>
      </div>
      <div className="asset-source" title={storagePath}>
        <span>{t('centralRoute.source')}</span>
        <code>{compactStoragePath}</code>
      </div>
    </div>
  </section>
}

export default StrategicCommandBoard
