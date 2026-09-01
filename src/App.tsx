import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Globe2,
  Languages,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Network,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unlink,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import catalogDocument from '../featured-skills.json'
import {
  categoryLabel,
  catalogChineseName,
  catalogPurpose,
  filterCatalog,
  filterSkills,
  formatCompactNumber,
  recommendationReason,
  scoreBand,
} from './appLogic'
import type {
  CatalogDocument,
  CatalogEntry,
  CenterSnapshot,
  Locale,
  SkillAsset,
  SkillContent,
  ToolStatus,
} from './contracts'
import { getCopy } from './i18n'

type Section = 'command' | 'assets' | 'intelligence' | 'tools' | 'audit' | 'about'

const catalog = catalogDocument as CatalogDocument

const navIcons = [LayoutDashboard, Boxes, Sparkles, Network, ShieldCheck, Settings2]
const sections: Section[] = ['command', 'assets', 'intelligence', 'tools', 'audit', 'about']

function isDesktopRuntime(): boolean {
  return '__TAURI_INTERNALS__' in window
}

function demoSnapshot(): CenterSnapshot {
  const skills = catalog.skills.slice(0, 12).map<SkillAsset>((item) => ({
    id: item.name,
    nameZh: `能力索引·${item.name}`,
    nameEn: item.name,
    summaryZh: '网页预览数据；桌面版会读取本机技能并生成中文理解。',
    summaryEn: item.summary || 'Browser preview data.',
    purposeZh: `用于发现和评估 ${item.name} 相关能力。`,
    purposeEn: `Used to discover and assess ${item.name}-related capability.`,
    featuresZh: ['保留英文兼容标识', '按包参谋规则生成中文理解', '安装前需要人工复核'],
    featuresEn: ['Preserves compatible English ID', 'Uses BaoCanMou interpretation', 'Requires manual review before installation'],
    category: item.category,
    path: `~/.agents/skills/${item.name}`,
    score: Math.round(item.recommendation_score),
    status: 'ready',
    riskLevel: 'low',
    riskFlags: [],
    fileCount: 1,
    contentHash: item.slug,
    modifiedAt: 0,
    translationMode: 'generated',
    previewKind: 'generated',
    connections: [],
  }))
  return {
    centerPath: '~/.agents/skills',
    generatedAt: Math.floor(Date.now() / 1000),
    skills,
    tools: ['Codex', 'Claude Code', 'Gemini CLI', 'Cursor'].map<ToolStatus>((name, index) => ({
      id: name.toLowerCase().replaceAll(' ', '-'),
      name,
      detected: index < 2,
      skillsPath: `~/.${name.toLowerCase().split(' ')[0]}/skills`,
      linkedCount: index < 2 ? skills.length : 0,
      conflictCount: 0,
    })),
    summary: {
      assetCount: skills.length,
      readyCount: skills.length,
      attentionCount: 0,
      connectionCount: skills.length * 2,
      chineseReadyCount: skills.length,
      screenshotCount: 0,
    },
  }
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('bcm-locale') === 'en' ? 'en' : 'zh'))
  const [section, setSection] = useState<Section>('command')
  const [snapshot, setSnapshot] = useState<CenterSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedSkill, setSelectedSkill] = useState<SkillAsset | null>(null)
  const [workingKey, setWorkingKey] = useState('')
  const t = getCopy(locale)

  const scan = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSnapshot(isDesktopRuntime() ? await invoke<CenterSnapshot>('scan_center') : demoSnapshot())
    } catch (scanError) {
      setError(String(scanError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void scan()
  }, [scan])

  useEffect(() => {
    localStorage.setItem('bcm-locale', locale)
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const chooseSection = (next: Section) => {
    setSection(next)
    setQuery('')
    setCategory('all')
  }

  const updateSnapshot = (next: CenterSnapshot, selectedId?: string) => {
    setSnapshot(next)
    if (selectedId) setSelectedSkill(next.skills.find((skill) => skill.id === selectedId) ?? null)
  }

  const handleConnection = async (skillId: string, toolId: string, connected: boolean) => {
    if (!isDesktopRuntime()) return
    const key = `${skillId}:${toolId}`
    setWorkingKey(key)
    setError('')
    try {
      const command = connected ? 'disconnect_skill' : 'connect_skill'
      const next = await invoke<CenterSnapshot>(command, { skillId, toolId })
      updateSnapshot(next, skillId)
    } catch (actionError) {
      setError(String(actionError))
    } finally {
      setWorkingKey('')
    }
  }

  const handleSaveTranslation = async (skillId: string, nameZh: string, summaryZh: string) => {
    if (!isDesktopRuntime()) return
    setWorkingKey(`translate:${skillId}`)
    setError('')
    try {
      const next = await invoke<CenterSnapshot>('save_translation', {
        input: { skillId, nameZh, summaryZh },
      })
      updateSnapshot(next, skillId)
    } catch (actionError) {
      setError(String(actionError))
    } finally {
      setWorkingKey('')
    }
  }

  const handleExternal = async (url: string) => {
    if (isDesktopRuntime()) await openUrl(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="window-drag" data-tauri-drag-region />
        <div className="brand-lockup">
          <img src="/logo-mark.png" alt="" />
          <div>
            <strong>{t.brand}</strong>
            <span>{t.version}</span>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Primary">
          {sections.map((item, index) => {
            const Icon = navIcons[index]
            return (
              <button key={item} className={section === item ? 'active' : ''} onClick={() => chooseSection(item)}>
                <Icon size={18} strokeWidth={1.8} />
                <span><strong>{t.nav[index]}</strong><small>{t.navHint[index]}</small></span>
                <ChevronRight size={15} />
              </button>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />
          <div>
            <strong>{t.localOnly}</strong>
            <small>{snapshot?.centerPath ?? '~/.agents/skills'}</small>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar" data-tauri-drag-region>
          <div className="crumb">
            <span>BAOCANMOU</span>
            <ChevronRight size={14} />
            <strong>{t.nav[sections.indexOf(section)]}</strong>
          </div>
          <div className="top-actions">
            <button className="language-toggle" onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}>
              <Languages size={16} /> {locale === 'zh' ? 'EN' : '中文'}
            </button>
            <button className="scan-button" onClick={() => void scan()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> {t.refresh}
            </button>
          </div>
        </header>

        <div className="content-scroll">
          {!isDesktopRuntime() && <div className="preview-banner">{t.browserPreview}</div>}
          {error && <div className="error-banner"><CircleAlert size={17} /> <span>{t.error}：{error}</span></div>}
          {loading && !snapshot ? <Loading copy={t.loading} /> : null}
          {snapshot && section === 'command' && <CommandPage snapshot={snapshot} locale={locale} onOpenAssets={() => chooseSection('assets')} />}
          {snapshot && section === 'assets' && (
            <AssetsPage
              snapshot={snapshot}
              locale={locale}
              query={query}
              category={category}
              onQuery={setQuery}
              onCategory={setCategory}
              onSelect={setSelectedSkill}
            />
          )}
          {section === 'intelligence' && (
            <IntelligencePage locale={locale} query={query} category={category} onQuery={setQuery} onCategory={setCategory} onOpen={handleExternal} />
          )}
          {snapshot && section === 'tools' && <ToolsPage snapshot={snapshot} locale={locale} />}
          {snapshot && section === 'audit' && <AuditPage snapshot={snapshot} locale={locale} onSelect={setSelectedSkill} />}
          {section === 'about' && <AboutPage locale={locale} onOpen={handleExternal} />}
        </div>
      </main>

      {selectedSkill && snapshot && (
        <SkillDrawer
          skill={selectedSkill}
          tools={snapshot.tools}
          locale={locale}
          workingKey={workingKey}
          onClose={() => setSelectedSkill(null)}
          onConnection={handleConnection}
          onSaveTranslation={handleSaveTranslation}
        />
      )}
    </div>
  )
}

function Loading({ copy }: { copy: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>{copy}</span></div>
}

function CommandPage({ snapshot, locale, onOpenAssets }: { snapshot: CenterSnapshot; locale: Locale; onOpenAssets: () => void }) {
  const t = getCopy(locale)
  const metrics = [
    [t.assets, snapshot.summary.assetCount, Boxes],
    [t.ready, snapshot.summary.readyCount, BadgeCheck],
    [t.attention, snapshot.summary.attentionCount, CircleAlert],
    [t.connections, snapshot.summary.connectionCount, Link2],
    [t.chinese, snapshot.summary.chineseReadyCount, Languages],
    [t.screenshots, snapshot.summary.screenshotCount, BookOpenText],
  ] as const
  return (
    <div className="page command-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">BAOCANMOU ORIGINAL CORE</span>
          <h1>{locale === 'zh' ? '管理能力，不堆数量。' : 'Govern capability, not volume.'}</h1>
          <p>{t.fiveLoopDesc}</p>
          <button onClick={onOpenAssets}>{locale === 'zh' ? '进入能力资产' : 'Open capability assets'} <ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <div className="strategy-path"><i /><i /><i /><i /><i /></div>
          <span>{snapshot.summary.assetCount}</span>
          <small>{t.assets}</small>
        </div>
      </section>

      <section className="metric-row">
        {metrics.map(([label, value, Icon]) => (
          <article key={label}><Icon size={18} /><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      <section className="two-column">
        <article className="panel five-loop-panel">
          <div className="section-heading"><div><span className="eyebrow">METHOD</span><h2>{t.fiveLoop}</h2></div><span>01—05</span></div>
          <div className="five-loop">
            {t.loops.map((loop, index) => (
              <div key={loop}><b>0{index + 1}</b><strong>{loop}</strong><small>{t.loopNotes[index]}</small></div>
            ))}
          </div>
        </article>
        <article className="panel local-panel">
          <div className="shield-orbit"><ShieldCheck size={30} /><i /><i /><i /></div>
          <h2>{t.localOnly}</h2>
          <p>{t.localOnlyDesc}</p>
          <code>{snapshot.centerPath}</code>
        </article>
      </section>

      <section className="panel recent-panel">
        <div className="section-heading"><div><span className="eyebrow">LATEST ASSETS</span><h2>{locale === 'zh' ? '最近能力' : 'Recent capabilities'}</h2></div></div>
        <div className="recent-list">
          {snapshot.skills.slice(0, 6).map((skill) => <SkillRow key={skill.id} skill={skill} locale={locale} onSelect={onOpenAssets} />)}
        </div>
      </section>
    </div>
  )
}

function SearchBar({ locale, value, onChange }: { locale: Locale; value: string; onChange: (value: string) => void }) {
  const t = getCopy(locale)
  return <label className="search-field"><Search size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={t.search} /></label>
}

function CategoryTabs({ values, current, locale, onChange }: { values: string[]; current: string; locale: Locale; onChange: (value: string) => void }) {
  const t = getCopy(locale)
  return (
    <div className="category-tabs">
      {['all', ...values].map((value) => (
        <button key={value} className={current === value ? 'active' : ''} onClick={() => onChange(value)}>
          {value === 'all' ? t.all : categoryLabel(value, locale)}
        </button>
      ))}
    </div>
  )
}

function AssetsPage({ snapshot, locale, query, category, onQuery, onCategory, onSelect }: {
  snapshot: CenterSnapshot
  locale: Locale
  query: string
  category: string
  onQuery: (value: string) => void
  onCategory: (value: string) => void
  onSelect: (skill: SkillAsset) => void
}) {
  const t = getCopy(locale)
  const categories = useMemo(() => [...new Set(snapshot.skills.map((skill) => skill.category))].sort(), [snapshot.skills])
  const skills = useMemo(() => filterSkills(snapshot.skills, query, category), [snapshot.skills, query, category])
  return (
    <div className="page">
      <div className="page-title"><div><span className="eyebrow">LOCAL FOUNDATION</span><h1>{t.assets}</h1><p>{snapshot.centerPath}</p></div><strong>{skills.length}</strong></div>
      <SearchBar locale={locale} value={query} onChange={onQuery} />
      <CategoryTabs values={categories} current={category} locale={locale} onChange={onCategory} />
      <div className="asset-grid">
        {skills.map((skill) => <SkillCard key={skill.id} skill={skill} locale={locale} onSelect={() => onSelect(skill)} />)}
      </div>
      {!skills.length && <div className="empty-state">{t.empty}</div>}
    </div>
  )
}

function SkillCard({ skill, locale, onSelect }: { skill: SkillAsset; locale: Locale; onSelect: () => void }) {
  const t = getCopy(locale)
  const connected = skill.connections.filter((connection) => ['link', 'copy'].includes(connection.mode)).length
  const features = locale === 'zh' ? skill.featuresZh : skill.featuresEn
  const glyph = categoryLabel(skill.category, 'zh').slice(0, 1)
  return (
    <article className="skill-card" onClick={onSelect}>
      <div className="skill-card-heading">
        <span className={`skill-card-icon category-${skill.category}`}>{glyph}</span>
        <div><h3>{locale === 'zh' ? skill.nameZh : skill.nameEn}</h3><code>{skill.id}</code></div>
        <span className={`score-ring ${scoreBand(skill.score)}`}>{skill.score}</span>
      </div>
      <div className="skill-purpose">
        <span>{t.purpose}</span>
        <p>{locale === 'zh' ? skill.purposeZh : skill.purposeEn}</p>
      </div>
      <div className="skill-card-features">
        {features.slice(0, 3).map((feature) => <span key={feature}><Check size={11} />{feature}</span>)}
      </div>
      <div className="skill-meta"><span>{categoryLabel(skill.category, locale)}</span><span>{skill.fileCount} {t.files}</span><span>{connected} {t.linked}</span></div>
      <div className="skill-card-footer"><span className={`risk-pill ${skill.riskLevel}`}>{t.risk} · {t[skill.riskLevel]}</span><button>{t.details}<ChevronRight size={15} /></button></div>
    </article>
  )
}

function SkillRow({ skill, locale, onSelect }: { skill: SkillAsset; locale: Locale; onSelect: () => void }) {
  return (
    <button className="skill-row" onClick={onSelect}>
      <span className={`score-dot ${scoreBand(skill.score)}`}>{skill.score}</span>
      <span><strong>{locale === 'zh' ? skill.nameZh : skill.nameEn}</strong><small>{skill.id}</small></span>
      <em>{categoryLabel(skill.category, locale)}</em>
      <ChevronRight size={16} />
    </button>
  )
}

function IntelligencePage({ locale, query, category, onQuery, onCategory, onOpen }: {
  locale: Locale
  query: string
  category: string
  onQuery: (value: string) => void
  onCategory: (value: string) => void
  onOpen: (url: string) => Promise<void>
}) {
  const t = getCopy(locale)
  const categories = useMemo(() => [...new Set(catalog.skills.map((skill) => skill.category))].sort(), [])
  const skills = useMemo(() => filterCatalog(catalog.skills, query, category), [query, category])
  return (
    <div className="page">
      <div className="page-title"><div><span className="eyebrow">EXTERNAL INDEX · NOT BUNDLED</span><h1>{t.intelligenceTitle}</h1><p>{t.intelligenceDesc}</p></div><strong>{catalog.total}</strong></div>
      <SearchBar locale={locale} value={query} onChange={onQuery} />
      <CategoryTabs values={categories} current={category} locale={locale} onChange={onCategory} />
      <div className="intelligence-list">
        {skills.map((skill) => <CatalogRow key={skill.slug} skill={skill} locale={locale} onOpen={onOpen} />)}
      </div>
      {!skills.length && <div className="empty-state">{t.empty}</div>}
    </div>
  )
}

function CatalogRow({ skill, locale, onOpen }: { skill: CatalogEntry; locale: Locale; onOpen: (url: string) => Promise<void> }) {
  const t = getCopy(locale)
  return (
    <article className="catalog-row">
      <span className="rank">{String(skill.rank).padStart(2, '0')}</span>
      <CatalogVisual skill={skill} />
      <div className="catalog-main">
        <div><h3>{locale === 'zh' ? catalogChineseName(skill) : skill.name}</h3><code>{skill.name} · {skill.source}</code></div>
        <p>{catalogPurpose(skill, locale)}</p>
        <div className="reason-list">{skill.recommendation_reasons.slice(0, 4).map((reason) => <span key={reason}>{recommendationReason(reason, locale)}</span>)}</div>
      </div>
      <div className="catalog-numbers">
        <span><b>{formatCompactNumber(skill.downloads, locale)}</b><small>{t.downloads}</small></span>
        <span><b>{formatCompactNumber(skill.stars, locale)}</b><small>{t.stars}</small></span>
        <span className="catalog-score"><b>{skill.recommendation_score.toFixed(1)}</b><small>{t.score}</small></span>
      </div>
      <button onClick={() => void onOpen(skill.source_url)}>{t.source}<ArrowUpRight size={15} /></button>
    </article>
  )
}

function CatalogVisual({ skill }: { skill: CatalogEntry }) {
  return (
    <div className={`catalog-visual category-${skill.category}`}>
      <span>{categoryLabel(skill.category, 'zh').slice(0, 1)}</span>
      <i /><i /><i />
    </div>
  )
}

function ToolsPage({ snapshot, locale }: { snapshot: CenterSnapshot; locale: Locale }) {
  const t = getCopy(locale)
  return (
    <div className="page">
      <div className="page-title"><div><span className="eyebrow">ONE SOURCE · MANY TOOLS</span><h1>{t.toolsTitle}</h1><p>{t.toolsDesc}</p></div><strong>{snapshot.tools.filter((tool) => tool.detected).length}/{snapshot.tools.length}</strong></div>
      <div className="tool-grid">
        {snapshot.tools.map((tool) => (
          <article key={tool.id} className={tool.detected ? 'tool-card detected' : 'tool-card'}>
            <div className="tool-monogram">{tool.name.slice(0, 2).toUpperCase()}</div>
            <div><h3>{tool.name}</h3><code>{tool.skillsPath}</code></div>
            <span className={tool.detected ? 'detected-label' : 'muted-label'}>{tool.detected ? t.detected : t.notDetected}</span>
            <dl><div><dt>{t.connected}</dt><dd>{tool.linkedCount}</dd></div><div><dt>{t.conflict}</dt><dd>{tool.conflictCount}</dd></div></dl>
          </article>
        ))}
      </div>
    </div>
  )
}

function AuditPage({ snapshot, locale, onSelect }: { snapshot: CenterSnapshot; locale: Locale; onSelect: (skill: SkillAsset) => void }) {
  const t = getCopy(locale)
  const risky = [...snapshot.skills].sort((a, b) => {
    const weight = { high: 3, medium: 2, low: 1 }
    return weight[b.riskLevel] - weight[a.riskLevel] || a.score - b.score
  })
  return (
    <div className="page">
      <div className="page-title"><div><span className="eyebrow">STATIC REVIEW</span><h1>{t.auditTitle}</h1><p>{t.auditDesc}</p></div><strong>{snapshot.summary.attentionCount}</strong></div>
      <div className="audit-summary">
        {(['high', 'medium', 'low'] as const).map((level) => <article key={level} className={level}><span>{t[level]}</span><strong>{snapshot.skills.filter((skill) => skill.riskLevel === level).length}</strong></article>)}
      </div>
      <div className="audit-list">
        {risky.map((skill) => (
          <button key={skill.id} onClick={() => onSelect(skill)}>
            <span className={`risk-mark ${skill.riskLevel}`}><Activity size={16} /></span>
            <span><strong>{locale === 'zh' ? skill.nameZh : skill.nameEn}</strong><small>{skill.riskFlags.length ? skill.riskFlags.join(' · ') : (locale === 'zh' ? '未发现静态风险特征' : 'No static risk signal found')}</small></span>
            <em>{skill.score}</em><ChevronRight size={16} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AboutPage({ locale, onOpen }: { locale: Locale; onOpen: (url: string) => Promise<void> }) {
  const t = getCopy(locale)
  return (
    <div className="page about-page">
      <section className="about-hero">
        <img src="/logo-mark.png" alt="" />
        <span className="eyebrow">BAOCANMOU · WWW.BCMSJ.COM</span>
        <h1>{t.aboutTitle}</h1>
        <p>{t.aboutBody}</p>
      </section>
      <section className="originality-grid">
        {[
          [Database, locale === 'zh' ? '自有数据模型' : 'Original data model', locale === 'zh' ? '不依赖旧项目数据库与同步引擎。' : 'Independent from legacy project databases and sync engines.'],
          [Languages, locale === 'zh' ? '中文理解层' : 'Chinese understanding', locale === 'zh' ? '保留英文兼容标识，生成并允许校正中文名称与说明。' : 'Preserve compatible IDs while generating editable Chinese names and summaries.'],
          [Activity, locale === 'zh' ? '方策评分' : 'Fangce scoring', locale === 'zh' ? '结构、理解、可移植、安全、可核验五维计分。' : 'Structure, understanding, portability, safety, and verifiability.'],
          [ShieldCheck, locale === 'zh' ? '本地安全边界' : 'Local safety boundary', locale === 'zh' ? '不自动安装，不上传内容，不覆盖非托管目录。' : 'No automatic installs, uploads, or unmanaged overwrites.'],
        ].map(([Icon, title, body]) => (
          <article key={String(title)}><Icon size={22} /><h3>{String(title)}</h3><p>{String(body)}</p></article>
        ))}
      </section>
      <section className="license-panel"><BookOpenText size={20} /><div><strong>MIT OPEN SOURCE</strong><p>{t.openSource}</p></div></section>
      <div className="about-actions">
        <button onClick={() => void onOpen('https://www.bcmsj.com')}>{t.website}<Globe2 size={16} /></button>
        <button onClick={() => void onOpen('https://github.com/yht0912/baocanmou-ai-skill-center')}>{t.repository}<ArrowUpRight size={16} /></button>
      </div>
    </div>
  )
}

function SkillDrawer({ skill, tools, locale, workingKey, onClose, onConnection, onSaveTranslation }: {
  skill: SkillAsset
  tools: ToolStatus[]
  locale: Locale
  workingKey: string
  onClose: () => void
  onConnection: (skillId: string, toolId: string, connected: boolean) => Promise<void>
  onSaveTranslation: (skillId: string, nameZh: string, summaryZh: string) => Promise<void>
}) {
  const t = getCopy(locale)
  const [content, setContent] = useState<SkillContent | null>(null)
  const [contentError, setContentError] = useState('')
  const [editing, setEditing] = useState(false)
  const [nameZh, setNameZh] = useState(skill.nameZh)
  const [summaryZh, setSummaryZh] = useState(skill.summaryZh)

  useEffect(() => {
    setNameZh(skill.nameZh)
    setSummaryZh(skill.summaryZh)
  }, [skill])

  useEffect(() => {
    setContent(null)
    setContentError('')
    if (!isDesktopRuntime()) return
    void invoke<SkillContent>('read_skill', { skillId: skill.id }).then(setContent).catch((value: unknown) => setContentError(String(value)))
  }, [skill.id])

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true">
      <button className="drawer-backdrop" aria-label={t.cancel} onClick={onClose} />
      <aside className="skill-drawer">
        <div className="drawer-header"><button onClick={onClose}><X size={18} /></button><span>{skill.id}</span><span className={`score-ring ${scoreBand(skill.score)}`}>{skill.score}</span></div>
        <div className="drawer-scroll">
          <div className="drawer-title"><span className="eyebrow">{categoryLabel(skill.category, locale)} · {t.score}</span><h2>{locale === 'zh' ? skill.nameZh : skill.nameEn}</h2><p>{locale === 'zh' ? skill.summaryZh : skill.summaryEn || skill.summaryZh}</p></div>

          <section className="drawer-section">
            <div className="drawer-section-title"><strong>{t.purpose}</strong></div>
            <p className="purpose-copy">{locale === 'zh' ? skill.purposeZh : skill.purposeEn}</p>
            <div className="drawer-section-title features-title"><strong>{t.features}</strong></div>
            <ul className="feature-list">{(locale === 'zh' ? skill.featuresZh : skill.featuresEn).map((feature) => <li key={feature}><Check size={13} />{feature}</li>)}</ul>
          </section>

          {content?.previewDataUrl && (
            <section className="drawer-section preview-section">
              <div className="drawer-section-title"><strong>{t.preview}</strong><span>{t.realScreenshot}</span></div>
              <img className="skill-real-preview" src={content.previewDataUrl} alt={`${skill.nameZh} ${t.preview}`} />
            </section>
          )}

          <section className="drawer-section">
            <div className="drawer-section-title"><strong>{t.chineseUnderstanding}</strong><button onClick={() => setEditing(!editing)}>{editing ? t.cancel : t.editChinese}</button></div>
            {editing ? (
              <form onSubmit={(event) => { event.preventDefault(); void onSaveTranslation(skill.id, nameZh, summaryZh).then(() => setEditing(false)) }}>
                <input value={nameZh} onChange={(event) => setNameZh(event.target.value)} maxLength={80} />
                <textarea value={summaryZh} onChange={(event) => setSummaryZh(event.target.value)} maxLength={400} rows={4} />
                <button className="primary-button" disabled={workingKey === `translate:${skill.id}`}><Check size={15} />{t.save}</button>
              </form>
            ) : <div className="translation-card"><strong>{skill.nameZh}</strong><p>{skill.summaryZh}</p><small>{skill.translationMode}</small></div>}
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title"><strong>{t.toolsTitle}</strong><span>{skill.connections.filter((item) => ['link', 'copy'].includes(item.mode)).length}</span></div>
            <div className="connection-list">
              {tools.map((tool) => {
                const connection = skill.connections.find((item) => item.toolId === tool.id)
                const connected = connection?.mode === 'link' || connection?.mode === 'copy'
                const conflict = connection?.mode === 'conflict' || connection?.mode === 'broken'
                const busy = workingKey === `${skill.id}:${tool.id}`
                return (
                  <div key={tool.id}><span className="tool-mini">{tool.name.slice(0, 2).toUpperCase()}</span><span><strong>{tool.name}</strong><small>{conflict ? t.unmanaged : connected ? t.connected : tool.detected ? t.detected : t.notDetected}</small></span><button className={connected ? 'disconnect' : ''} disabled={busy || conflict || !isDesktopRuntime()} onClick={() => void onConnection(skill.id, tool.id, connected)}>{busy ? <LoaderCircle className="spin" size={14} /> : connected ? <Unlink size={14} /> : <Link2 size={14} />}{connected ? t.disconnect : t.connect}</button></div>
                )
              })}
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-title"><strong>{t.content}</strong><span>{skill.fileCount} {t.files}</span></div>
            {contentError && <p className="inline-error">{contentError}</p>}
            {content ? <pre className="skill-source">{content.markdown}</pre> : <div className="source-placeholder"><LoaderCircle className="spin" size={18} /></div>}
          </section>
        </div>
      </aside>
    </div>
  )
}
