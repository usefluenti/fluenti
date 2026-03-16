import { describe, it, expect, afterEach } from 'vitest'
import { getHydratedLocale } from '@fluenti/core'
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
    ...(config.detectBrowserLanguage !== undefined && { detectBrowserLanguage: config.detectBrowserLanguage }),
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
      ['path', (_ctx) => { calls.push('path') }],
      ['cookie', (ctx) => { calls.push('cookie'); ctx.setLocale('ja') }],
      ['header', (_ctx) => { calls.push('header') }],
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

describe('SSG scenario: path-only detection', () => {
  it('detects locale from path when cookie/header detectors are no-ops', async () => {
    // In SSG, cookie and header detectors silently fail → only path works
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => {
        // Simulate extractLocaleFromPath
        const match = ctx.path.match(/^\/([a-z]{2})(\/|$)/)
        if (match && ctx.locales.includes(match[1]!)) {
          ctx.setLocale(match[1]!)
        }
      }],
      ['cookie', () => { /* silent fail in SSG */ }],
      ['header', () => { /* silent fail in SSG */ }],
    ])

    const config = createConfig()

    expect(await runDetectors('/ja/about', config, detectors)).toBe('ja')
    expect(await runDetectors('/zh/contact', config, detectors)).toBe('zh')
    expect(await runDetectors('/en/home', config, detectors)).toBe('en')
  })

  it('falls back to defaultLocale for unprefixed paths in SSG', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', () => { /* no match for / */ }],
      ['cookie', () => { /* silent fail */ }],
      ['header', () => { /* silent fail */ }],
    ])

    const result = await runDetectors('/', createConfig(), detectors)
    expect(result).toBe('en')
  })

  it('SSG with prefix_except_default: default locale gets no prefix', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => {
        const match = ctx.path.match(/^\/([a-z]{2})(\/|$)/)
        if (match && ctx.locales.includes(match[1]!)) {
          ctx.setLocale(match[1]!)
        }
      }],
    ])

    const config = createConfig({ strategy: 'prefix_except_default' })

    // /about → no path match → defaultLocale 'en'
    expect(await runDetectors('/about', config, detectors)).toBe('en')
    // /ja/about → 'ja'
    expect(await runDetectors('/ja/about', config, detectors)).toBe('ja')
  })
})

describe('cookie detector edge cases', () => {
  it('sets locale when cookie contains a valid locale', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['cookie', (ctx) => {
        // Simulate useCookie returning a valid locale
        const cookieValue = 'ja'
        if (ctx.detectBrowserLanguage?.useCookie && ctx.locales.includes(cookieValue)) {
          ctx.setLocale(cookieValue)
        }
      }],
    ])

    const config = createConfig({
      detectOrder: ['cookie'],
      detectBrowserLanguage: { useCookie: true, cookieKey: 'fluenti_locale' },
    })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('ja')
  })

  it('ignores cookie with invalid locale value', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['cookie', (ctx) => {
        const cookieValue = 'fr'
        if (ctx.detectBrowserLanguage?.useCookie && ctx.locales.includes(cookieValue)) {
          ctx.setLocale(cookieValue)
        }
      }],
    ])

    const config = createConfig({
      detectOrder: ['cookie'],
      detectBrowserLanguage: { useCookie: true },
    })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('en')
  })

  it('skips cookie detector when useCookie is false', async () => {
    let detectorCalled = false
    const detectors = new Map<string, LocaleDetectorFn>([
      ['cookie', (ctx) => {
        if (!ctx.detectBrowserLanguage?.useCookie) return
        detectorCalled = true
        ctx.setLocale('ja')
      }],
    ])

    const config = createConfig({
      detectOrder: ['cookie'],
      detectBrowserLanguage: { useCookie: false },
    })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('en')
    expect(detectorCalled).toBe(false)
  })

  it('handles cookie detector that throws an exception', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['cookie', () => {
        throw new Error('useCookie failed outside Nuxt context')
      }],
      ['fallback', (ctx) => { ctx.setLocale('zh') }],
    ])

    const config = createConfig({ detectOrder: ['cookie', 'fallback'] })
    // The runDetectors function does not catch errors from detectors,
    // so a throwing detector will propagate
    await expect(runDetectors('/', config, detectors)).rejects.toThrow('useCookie failed outside Nuxt context')
  })
})

describe('header detector edge cases', () => {
  it('sets locale from Accept-Language header', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['header', (ctx) => {
        if (!ctx.isServer) return
        // Simulate Accept-Language parsing
        const acceptLang = 'ja,en;q=0.9'
        const preferred = acceptLang.split(',').map((part) => {
          const [lang, q] = part.trim().split(';q=')
          return { lang: lang!.trim().toLowerCase(), q: q ? parseFloat(q) : 1 }
        }).sort((a, b) => b.q - a.q)
        for (const { lang } of preferred) {
          if (ctx.locales.includes(lang)) {
            ctx.setLocale(lang)
            break
          }
        }
      }],
    ])

    const config = createConfig({ detectOrder: ['header'] })
    // Simulate server context
    const ctx_result = await runDetectorsWithServer('/about', config, detectors)
    expect(ctx_result).toBe('ja')
  })

  it('falls back when no Accept-Language header is present', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['header', (ctx) => {
        if (!ctx.isServer) return
        // No header → do nothing
      }],
    ])

    const config = createConfig({ detectOrder: ['header'] })
    const result = await runDetectors('/about', config, detectors)
    expect(result).toBe('en')
  })
})

describe('path detector edge cases', () => {
  it('extracts locale from path prefix', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => {
        if (ctx.strategy === 'no_prefix') return
        const match = ctx.path.match(/^\/([^/]+)(.*)$/)
        if (match && ctx.locales.includes(match[1]!)) {
          ctx.setLocale(match[1]!)
        }
      }],
    ])

    const config = createConfig({ detectOrder: ['path'], strategy: 'prefix' })
    const result = await runDetectors('/zh/contact', config, detectors)
    expect(result).toBe('zh')
  })

  it('does not match non-locale path segments', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => {
        if (ctx.strategy === 'no_prefix') return
        const match = ctx.path.match(/^\/([^/]+)(.*)$/)
        if (match && ctx.locales.includes(match[1]!)) {
          ctx.setLocale(match[1]!)
        }
      }],
    ])

    const config = createConfig({ detectOrder: ['path'], strategy: 'prefix' })
    const result = await runDetectors('/about/something', config, detectors)
    expect(result).toBe('en')
  })
})

describe('query detector edge cases', () => {
  it('extracts locale from query parameter', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['query', (ctx) => {
        // Simulate query string parsing
        const url = new URL(`http://localhost${ctx.path}`)
        const queryLocale = url.searchParams.get('locale')
        if (queryLocale && ctx.locales.includes(queryLocale)) {
          ctx.setLocale(queryLocale)
        }
      }],
    ])

    const config = createConfig({ detectOrder: ['query'] })
    const result = await runDetectors('/about?locale=zh', config, detectors)
    expect(result).toBe('zh')
  })

  it('falls back when query parameter is missing', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['query', (ctx) => {
        const url = new URL(`http://localhost${ctx.path}`)
        const queryLocale = url.searchParams.get('locale')
        if (queryLocale && ctx.locales.includes(queryLocale)) {
          ctx.setLocale(queryLocale)
        }
      }],
    ])

    const config = createConfig({ detectOrder: ['query'] })
    const result = await runDetectors('/about', config, detectors)
    expect(result).toBe('en')
  })
})

describe('detector priority and combination', () => {
  it('respects priority order: first detector to setLocale wins', async () => {
    const detectors = new Map<string, LocaleDetectorFn>([
      ['path', (ctx) => {
        const match = ctx.path.match(/^\/([^/]+)/)
        if (match && ctx.locales.includes(match[1]!)) {
          ctx.setLocale(match[1]!)
        }
      }],
      ['cookie', (ctx) => { ctx.setLocale('zh') }],
      ['header', (ctx) => { ctx.setLocale('ja') }],
    ])

    const config = createConfig({ detectOrder: ['path', 'cookie', 'header'] })
    const result = await runDetectors('/ja/about', config, detectors)
    expect(result).toBe('ja')
  })

  it('resolves correctly when all sources provide locales', async () => {
    const calls: string[] = []
    const detectors = new Map<string, LocaleDetectorFn>([
      ['query', (_ctx) => { calls.push('query') }],
      ['cookie', (ctx) => { calls.push('cookie'); ctx.setLocale('zh') }],
      ['path', (ctx) => { calls.push('path'); ctx.setLocale('ja') }],
    ])

    // query runs first but doesn't match, cookie matches and stops
    const config = createConfig({ detectOrder: ['query', 'cookie', 'path'] })
    const result = await runDetectors('/', config, detectors)
    expect(result).toBe('zh')
    expect(calls).toEqual(['query', 'cookie'])
  })
})

/**
 * Helper that patches isServer=true on the context.
 * We replicate runDetectors but force isServer=true.
 */
async function runDetectorsWithServer(
  path: string,
  config: FluentNuxtRuntimeConfig,
  detectorMap: Map<string, LocaleDetectorFn>,
): Promise<string> {
  let resolved: string | null = null
  let stopped = false

  const ctx: LocaleDetectContext = {
    path,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    strategy: config.strategy,
    ...(config.detectBrowserLanguage !== undefined && { detectBrowserLanguage: config.detectBrowserLanguage }),
    detectedLocale: null,
    setLocale(locale: string) {
      if (config.locales.includes(locale)) {
        resolved = locale
        ctx.detectedLocale = locale
        stopped = true
      }
    },
    isServer: true,
  }

  for (const name of config.detectOrder) {
    if (stopped) break
    const detector = detectorMap.get(name)
    if (detector) {
      await detector(ctx)
    }
  }

  return resolved ?? config.detectBrowserLanguage?.fallbackLocale ?? config.defaultLocale
}

describe('server → client hydration round-trip', () => {
  const g = globalThis as unknown as Record<string, unknown>

  afterEach(() => {
    if (typeof g['window'] !== 'undefined') {
      delete (g['window'] as Record<string, unknown>)['__FLUENTI_LOCALE__']
    }
  })

  it('getHydratedLocale reads the server-injected locale', () => {
    // Simulate what plugin.ts does on the server: inject window.__FLUENTI_LOCALE__
    g['window'] = { __FLUENTI_LOCALE__: 'ja' }

    // Client reads it back
    const locale = getHydratedLocale('en')
    expect(locale).toBe('ja')

    delete g['window']
  })

  it('getHydratedLocale falls back to defaultLocale when not injected', () => {
    g['window'] = {}
    const locale = getHydratedLocale('en')
    expect(locale).toBe('en')
    delete g['window']
  })

  it('getHydratedLocale falls back when no window exists (SSR)', () => {
    const origWindow = g['window']
    delete g['window']
    const locale = getHydratedLocale('zh')
    expect(locale).toBe('zh')
    if (origWindow !== undefined) {
      g['window'] = origWindow
    }
  })
})
