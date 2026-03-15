import { describe, it, expect } from 'vitest'
import type { LocaleDetectContext, LocaleDetectorFn, FluentNuxtRuntimeConfig } from '../src/types'

/**
 * Standalone test for the detection engine logic.
 *
 * We replicate the runDetectors logic here to avoid importing files that
 * depend on Nuxt's #imports (useCookie, useRoute, etc.).
 */

function createConfig(overrides?: Partial<FluentNuxtRuntimeConfig>): FluentNuxtRuntimeConfig {
  return {
    locales: ['en', 'ja', 'zh'],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectOrder: ['path', 'cookie', 'header'],
    ...overrides,
  }
}

async function runDetectors(
  path: string,
  config: FluentNuxtRuntimeConfig,
  detectorMap: Map<string, LocaleDetectorFn>,
  hookFn?: (ctx: LocaleDetectContext) => void | Promise<void>,
): Promise<string> {
  let resolved: string | null = null
  let stopped = false

  const ctx: LocaleDetectContext = {
    path,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    strategy: config.strategy,
    detectBrowserLanguage: config.detectBrowserLanguage,
    detectedLocale: null,
    setLocale(locale: string) {
      if (config.locales.includes(locale)) {
        resolved = locale
        ctx.detectedLocale = locale
        stopped = true
      }
    },
    isServer: false,
  }

  for (const name of config.detectOrder) {
    if (stopped) break
    const detector = detectorMap.get(name)
    if (detector) {
      await detector(ctx)
    }
  }

  if (hookFn && !stopped) {
    await hookFn(ctx)
  }

  return resolved ?? config.detectBrowserLanguage?.fallbackLocale ?? config.defaultLocale
}

describe('runDetectors', () => {
  it('runs detectors in order and stops at first match', async () => {
    const calls: string[] = []
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => { calls.push('path') }],
      ['cookie', (ctx) => { calls.push('cookie'); ctx.setLocale('ja') }],
      ['header', (ctx) => { calls.push('header') }],
    ])

    const result = await runDetectors('/about', createConfig(), detectors)
    expect(result).toBe('ja')
    expect(calls).toEqual(['path', 'cookie'])
  })

  it('falls back to defaultLocale when no detector matches', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', () => {}],
      ['cookie', () => {}],
      ['header', () => {}],
    ])

    const result = await runDetectors('/', createConfig(), detectors)
    expect(result).toBe('en')
  })

  it('falls back to detectBrowserLanguage.fallbackLocale', async () => {
    const config = createConfig({
      detectBrowserLanguage: { fallbackLocale: 'zh' },
    })
    const detectors = new Map<string, LocaleDetectorFn>()

    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('zh')
  })

  it('respects custom detectOrder', async () => {
    const calls: string[] = []
    const detectors = new Map<string, LocaleDetectorFn>([
      ['cookie', (ctx) => { calls.push('cookie'); ctx.setLocale('zh') }],
      ['path', (ctx) => { calls.push('path'); ctx.setLocale('ja') }],
    ])

    const config = createConfig({ detectOrder: ['cookie', 'path'] })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('zh')
    expect(calls).toEqual(['cookie'])
  })

  it('ignores setLocale with invalid locale', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['custom', (ctx) => { ctx.setLocale('invalid-locale') }],
      ['fallback', (ctx) => { ctx.setLocale('ja') }],
    ])

    const config = createConfig({ detectOrder: ['custom', 'fallback'] })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('ja')
  })

  it('supports async detectors', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['async-db', async (ctx) => {
        await new Promise((r) => setTimeout(r, 10))
        ctx.setLocale('zh')
      }],
    ])

    const config = createConfig({ detectOrder: ['async-db'] })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('zh')
  })
})

describe('fluenti:detect-locale hook', () => {
  it('runs hook after detectors when no detector matched', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', () => {}],
    ])

    const result = await runDetectors('/', createConfig(), detectors, (ctx) => {
      ctx.setLocale('ja')
    })
    expect(result).toBe('ja')
  })

  it('does not run hook if a detector already matched', async () => {
    let hookCalled = false
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => { ctx.setLocale('zh') }],
    ])

    const result = await runDetectors('/', createConfig(), detectors, () => {
      hookCalled = true
    })
    expect(result).toBe('zh')
    expect(hookCalled).toBe(false)
  })

  it('hook can override when no detector matched', async () => {
    const detectors = new Map<string, LocaleDetectorFn>()
    const config = createConfig({ detectOrder: [] })

    const result = await runDetectors('/', config, detectors, (ctx) => {
      // Simulate reading from database
      ctx.setLocale('ja')
    })
    expect(result).toBe('ja')
  })

  it('hook receives detectedLocale as null when no match', async () => {
    const detectors = new Map<string, LocaleDetectorFn>()
    let capturedCtx: LocaleDetectContext | null = null

    await runDetectors('/', createConfig({ detectOrder: [] }), detectors, (ctx) => {
      capturedCtx = ctx
    })

    expect(capturedCtx!.detectedLocale).toBe(null)
  })

  it('async hook works', async () => {
    const detectors = new Map<string, LocaleDetectorFn>()

    const result = await runDetectors('/', createConfig({ detectOrder: [] }), detectors, async (ctx) => {
      await new Promise((r) => setTimeout(r, 10))
      ctx.setLocale('zh')
    })
    expect(result).toBe('zh')
  })
})

describe('LocaleDetectContext', () => {
  it('exposes all expected properties', async () => {
    let capturedCtx: LocaleDetectContext | null = null
    const config = createConfig({
      detectBrowserLanguage: { useCookie: true, cookieKey: 'my_locale' },
    })

    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => { capturedCtx = ctx }],
    ])

    await runDetectors('/ja/about', config, detectors)

    expect(capturedCtx).not.toBe(null)
    expect(capturedCtx!.path).toBe('/ja/about')
    expect(capturedCtx!.locales).toEqual(['en', 'ja', 'zh'])
    expect(capturedCtx!.defaultLocale).toBe('en')
    expect(capturedCtx!.strategy).toBe('prefix_except_default')
    expect(capturedCtx!.detectBrowserLanguage).toEqual({ useCookie: true, cookieKey: 'my_locale' })
    expect(typeof capturedCtx!.setLocale).toBe('function')
    expect(typeof capturedCtx!.isServer).toBe('boolean')
  })
})
