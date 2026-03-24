import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
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

  it('uses .fluenti as the default generated module directory', { timeout: 15_000 }, () => {
    const projectRoot = resolve(process.cwd(), 'tests/fixtures')
    const config = resolveConfig(projectRoot)

    expect(config.serverModuleOutDir).toBe('.fluenti')
  })

  it('propagates config loader failures instead of falling back silently', async () => {
    const coreConfig = await import('@fluenti/core/config')
    const spy = vi.spyOn(coreConfig, 'loadConfigSync').mockImplementation(() => {
      throw new Error('next config broken')
    })

    expect(() => resolveConfig('/project')).toThrow('next config broken')

    spy.mockRestore()
  })
})
