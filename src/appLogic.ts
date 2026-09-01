import type { CatalogEntry, Locale, SkillAsset } from './contracts'

const categoryNames: Record<string, [string, string]> = {
  design: ['设计', 'Design'],
  development: ['开发', 'Development'],
  content: ['内容', 'Content'],
  presentation: ['演示', 'Presentation'],
  video: ['视频', 'Video'],
  data: ['数据', 'Data'],
  security: ['安全', 'Security'],
  automation: ['自动化', 'Automation'],
  marketing: ['营销', 'Marketing'],
  research: ['研究', 'Research'],
  productivity: ['效率', 'Productivity'],
  general: ['通用', 'General'],
  'ai-assistant': ['AI 助手', 'AI assistant'],
  'browser-automation': ['浏览器自动化', 'Browser automation'],
  'data-visualization': ['数据可视化', 'Data visualization'],
  database: ['数据库', 'Database'],
  devops: ['工程运维', 'DevOps'],
}

const reasonNames: Record<string, [string, string]> = {
  'high-adoption': ['采用量高', 'High adoption'],
  'fast-momentum': ['近期增长快', 'Fast momentum'],
  'actively-maintained': ['维护活跃', 'Actively maintained'],
  'official-source': ['官方来源', 'Official source'],
  'clear-license': ['许可明确', 'Clear license'],
  'complete-documentation': ['资料完整', 'Complete documentation'],
  'baocanmou-fit': ['符合能力方向', 'Capability fit'],
}

export function categoryLabel(category: string, locale: Locale): string {
  const labels = categoryNames[category] ?? categoryNames.general
  return labels[locale === 'zh' ? 0 : 1]
}

export function recommendationReason(reason: string, locale: Locale): string {
  const labels = reasonNames[reason]
  return labels ? labels[locale === 'zh' ? 0 : 1] : reason.replaceAll('-', ' ')
}

export function catalogChineseName(skill: Pick<CatalogEntry, 'name' | 'category'>): string {
  return `${categoryLabel(skill.category, 'zh')}能力 · ${skill.name}`
}

export function catalogPurpose(skill: Pick<CatalogEntry, 'name' | 'category'>, locale: Locale): string {
  const name = skill.name.toLowerCase()
  const specific = name.includes('find-skills')
    ? ['发现并筛选适合当前任务的 AI 技能', 'Discover and shortlist AI Skills for the current task']
    : name.includes('agent-browser') || name.includes('browser')
      ? ['让 AI 操作网页、读取页面状态并验证交互结果', 'Operate webpages, read page state, and verify interactions']
      : name.includes('grill')
        ? ['通过追问澄清需求、暴露遗漏并形成可执行方案', 'Clarify requirements, expose gaps, and form an executable plan']
        : null
  const purposes: Record<string, [string, string]> = {
    design: ['用于视觉、界面与设计质量相关任务', 'For visual, interface, and design-quality work'],
    development: ['用于代码开发、调试与工程交付', 'For coding, debugging, and engineering delivery'],
    content: ['用于内容策划、写作与传播优化', 'For content planning, writing, and distribution'],
    presentation: ['用于演示文稿的结构与成品输出', 'For presentation structure and final output'],
    video: ['用于视频策划、制作与动效表达', 'For video planning, production, and motion'],
    security: ['用于安全检查、风险判断与修复验证', 'For security review, risk decisions, and fix verification'],
    data: ['用于数据处理、分析与可视化', 'For data preparation, analysis, and visualization'],
    'data-visualization': ['用于数据分析与可视化表达', 'For data analysis and visualization'],
    marketing: ['用于营销策略、转化与内容增长', 'For marketing strategy, conversion, and growth'],
    research: ['用于资料研究、分析与结论整理', 'For research, analysis, and synthesis'],
    'ai-assistant': ['用于增强 AI 的规划、分析或任务执行能力', 'For stronger AI planning, analysis, or task execution'],
    'browser-automation': ['用于网页操作、自动化与交互验收', 'For browser operations, automation, and interaction checks'],
    productivity: ['用于减少重复操作并提高日常工作效率', 'For reducing repetitive work and improving productivity'],
    devops: ['用于构建、部署、监测和工程运维', 'For build, deployment, monitoring, and operations'],
  }
  const label = specific ?? purposes[skill.category] ?? ['用于对应任务的结构化执行与检查', 'For structured task execution and review']
  return `${label[locale === 'zh' ? 0 : 1]}。`
}

export function formatCompactNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function filterSkills(skills: SkillAsset[], query: string, category: string): SkillAsset[] {
  const needle = query.trim().toLocaleLowerCase()
  return skills.filter((skill) => {
    const categoryMatches = category === 'all' || skill.category === category
    if (!categoryMatches) return false
    if (!needle) return true
    return [skill.nameZh, skill.nameEn, skill.id, skill.summaryZh, skill.summaryEn]
      .join('\n')
      .toLocaleLowerCase()
      .includes(needle)
  })
}

export function filterCatalog(catalog: CatalogEntry[], query: string, category: string): CatalogEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  return catalog.filter((skill) => {
    const categoryMatches = category === 'all' || skill.category === category
    if (!categoryMatches) return false
    if (!needle) return true
    return [skill.name, skill.summary, skill.source, skill.category]
      .join('\n')
      .toLocaleLowerCase()
      .includes(needle)
  })
}

export function scoreBand(score: number): 'strong' | 'steady' | 'attention' {
  if (score >= 90) return 'strong'
  if (score >= 75) return 'steady'
  return 'attention'
}
