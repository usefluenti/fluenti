import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/read-config'

describe('resolveConfig', () => {
  it('loads locales from fluenti.config.ts', { timeout: 15_000 }, () => {
    const projectRoot = resolve(process.cwd(), 'tests/fixtures')
    const config = resolveConfig(projectRoot)

    const defaultLocale = config.fluentiConfig.defaultLocale ?? config.fluentiConfig.sourceLocale
    expect(defaultLocale).toBe('en')
    expect(config.fluentiConfig.locales).toEqual(['en', 'zh-CN', 'ja'])
    expect(config.fluentiConfig.compileOutDir).toBe('./src/locales/compiled')
  })
})
