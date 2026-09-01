import { describe, expect, it } from 'vitest'
import { getSkillDisplayNames, skillChineseNameMap } from './skillDisplayName'

describe('skill display names', () => {
  it('shows a curated Chinese title and preserves the English identifier', () => {
    expect(getSkillDisplayNames('browser-testing-with-devtools')).toEqual({
      primary: '浏览器开发工具测试',
      secondary: 'browser-testing-with-devtools',
      translated: true,
    })
  })

  it('does not duplicate an existing Chinese title', () => {
    expect(getSkillDisplayNames('品牌诊断')).toEqual({
      primary: '品牌诊断',
      secondary: null,
      translated: false,
    })
  })

  it('provides a readable fallback for a new English skill', () => {
    expect(getSkillDisplayNames('custom-video-workflow').primary).toBe('CUSTOM · 视频 · 工作流')
    expect(getSkillDisplayNames('ponytail').primary).toBe('ponytail 专项能力')
  })

  it('adds a Chinese display name for the newly managed ELI5 skill', () => {
    expect(getSkillDisplayNames('eli5')).toEqual({
      primary: '5 岁也能懂',
      secondary: 'eli5',
      translated: true,
    })
  })

  it('adds a Chinese display name for the managed mono-color skill', () => {
    expect(getSkillDisplayNames('mono-color')).toEqual({
      primary: '单色编辑印刷',
      secondary: 'mono-color',
      translated: true,
    })
  })

  it('adds a Chinese display name for the managed NotebookLM ingestion skill', () => {
    expect(getSkillDisplayNames('qiaomu-anything-to-notebooklm')).toEqual({
      primary: '全内容转 NotebookLM',
      secondary: 'qiaomu-anything-to-notebooklm',
      translated: true,
    })
  })

  it('contains curated translations for the current managed inventory', () => {
    expect(Object.keys(skillChineseNameMap).length).toBeGreaterThanOrEqual(200)
  })
})
