import { describe, it, expect, vi } from 'vitest'
import { createFluentiCore } from '../src/index'
import { createLocaleLoader } from '../src/locale-loader'

// ---------------------------------------------------------------------------
// Edge cases — error recovery and concurrent loads
// ---------------------------------------------------------------------------
// Tests locale loading behavior through createFluentiCore's loadMessages/setLocale.
// The core createFluentiCore is synchronous; framework-specific async loaders
// (vue/solid/react) are tested in their own packages.
// ---------------------------------------------------------------------------

describe('edge cases — error recovery and concurrent loads', () => {
  it('loadMessages with invalid locale still stores messages', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    // Loading messages for a new locale should work
    i18n.loadMessages('fr', { greeting: 'Bonjour' })
    i18n.setLocale('fr')
    expect(i18n.t('greeting')).toBe('Bonjour')
  })

  it('setLocale to unknown locale — locale changes but translations fall back to id', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    i18n.setLocale('xx')
    expect(i18n.locale).toBe('xx')
    // No messages loaded for 'xx', should return key
    expect(i18n.t('hello')).toBe('hello')
    warnSpy.mockRestore()
  })

  it('loadMessages merges with existing keys via spread', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { a: 'Alpha', b: 'Bravo' } },
    })

    // Load additional messages — should merge, not replace
    i18n.loadMessages('en', { c: 'Charlie', d: 'Delta' })

    expect(i18n.t('a')).toBe('Alpha')
    expect(i18n.t('b')).toBe('Bravo')
    expect(i18n.t('c')).toBe('Charlie')
    expect(i18n.t('d')).toBe('Delta')
  })

  it('loadMessages overwrites existing key with same id', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { greeting: 'Hello' } },
    })

    i18n.loadMessages('en', { greeting: 'Hi' })
    expect(i18n.t('greeting')).toBe('Hi')
  })

  it('3+ consecutive setLocale calls — only last locale is active', () => {
    const localeChanges: string[] = []
    const i18n = createFluentiCore({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' },
        de: { greeting: 'Hallo' },
        ja: { greeting: 'こんにちは' },
      },
      onLocaleChange: (newLocale) => { localeChanges.push(newLocale) },
    })

    i18n.setLocale('fr')
    i18n.setLocale('de')
    i18n.setLocale('ja')

    expect(i18n.locale).toBe('ja')
    expect(i18n.t('greeting')).toBe('こんにちは')
    expect(localeChanges).toEqual(['fr', 'de', 'ja'])
  })

  it('setLocale to same locale does not fire onLocaleChange', () => {
    const changes: string[] = []
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      onLocaleChange: (newLocale) => { changes.push(newLocale) },
    })

    i18n.setLocale('en')
    expect(changes).toEqual([])
  })

  it('loadMessages for locale then setLocale uses loaded messages', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
    })

    // Load messages for a locale that was not in initial config
    i18n.loadMessages('zh-CN', { welcome: '欢迎' })
    i18n.setLocale('zh-CN')
    expect(i18n.t('welcome')).toBe('欢迎')
  })

  it('getLocales returns all locales with loaded messages', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { a: 'A' } },
    })

    i18n.loadMessages('fr', { b: 'B' })
    i18n.loadMessages('de', { c: 'C' })

    const locales = i18n.getLocales()
    expect(locales).toContain('en')
    expect(locales).toContain('fr')
    expect(locales).toContain('de')
  })

  it('missing handler called when loadMessages not done for locale', () => {
    const missing = vi.fn().mockReturnValue('MISSING')
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      missing,
    })

    // No messages loaded, missing handler should be called
    const result = i18n.t('nonexistent')
    expect(result).toBe('MISSING')
    expect(missing).toHaveBeenCalledWith('en', 'nonexistent')
  })

  it('loadMessages empty object does not break existing translations', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: { greeting: 'Hello' } },
    })

    i18n.loadMessages('en', {})
    expect(i18n.t('greeting')).toBe('Hello')
  })
})

// ---------------------------------------------------------------------------
// createLocaleLoader — async race-condition protection
// ---------------------------------------------------------------------------
// Tests the standalone createLocaleLoader which supports async loadMessages
// and split runtime __switchLocale, with request-ID based stale-request
// detection to prevent race conditions.
// ---------------------------------------------------------------------------

/** Helper: create a promise that resolves after `ms` milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// createLocaleLoader — comprehensive coverage
// ---------------------------------------------------------------------------

describe('createLocaleLoader — basic operations', () => {
  it('getLocale returns the initial locale', () => {
    const loader = createLocaleLoader({ locale: 'en' })
    expect(loader.getLocale()).toBe('en')
  })

  it('getMessages returns initial messages', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })
    expect(loader.getMessages()).toEqual({ en: { hello: 'Hello' } })
  })

  it('getLoadedLocales returns locales from initial messages', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
    })
    const locales = loader.getLoadedLocales()
    expect(locales.has('en')).toBe(true)
    expect(locales.has('fr')).toBe(true)
  })

  it('isLoading is false initially', () => {
    const loader = createLocaleLoader({ locale: 'en' })
    expect(loader.isLoading()).toBe(false)
  })

  it('setLocale with pre-loaded messages and no loadMessages — instant switch', async () => {
    const localeChanges: string[] = []
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      onLocaleChange: (locale) => { localeChanges.push(locale) },
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('fr')
    expect(localeChanges).toEqual(['fr'])
  })

  it('setLocale with pre-loaded messages and loadMessages + split runtime __switchLocale', async () => {
    const switchLog: string[] = []
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      loadMessages: async (locale: string) => ({ greeting: `greeting-${locale}` }),
      getSplitRuntime: () => ({
        __switchLocale: async (locale: string) => { switchLog.push(locale) },
      }),
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('fr')
    expect(switchLog).toEqual(['fr'])
  })

  it('setLocale with pre-loaded messages and split runtime without __switchLocale', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
      loadMessages: async (locale: string) => ({ greeting: `greeting-${locale}` }),
      getSplitRuntime: () => ({}),
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('fr')
  })

  it('setLocale with no messages and no loadMessages warns', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('en')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No messages for locale "fr"'),
    )
    warnSpy.mockRestore()
  })

  it('setLocale async loading fires onLoadingChange and onMessagesChange', async () => {
    const loadingStates: boolean[] = []
    const messagesChanged: Record<string, unknown>[] = []
    const loadedLocalesChanged: ReadonlySet<string>[] = []

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages: async (_locale: string) => {
        await delay(5)
        return { hello: 'Bonjour' }
      },
      onLoadingChange: (loading) => { loadingStates.push(loading) },
      onMessagesChange: (msgs) => { messagesChanged.push({ ...msgs }) },
      onLoadedLocalesChange: (locales) => { loadedLocalesChanged.push(locales) },
    })

    await loader.setLocale('fr')
    expect(loadingStates).toEqual([true, false])
    expect(messagesChanged.length).toBeGreaterThan(0)
    expect(loadedLocalesChanged.length).toBeGreaterThan(0)
    expect(loader.getLoadedLocales().has('fr')).toBe(true)
  })

  it('setLocale async loading with split runtime __switchLocale', async () => {
    const switchLog: string[] = []
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (locale: string) => {
        await delay(5)
        return { greeting: `greeting-${locale}` }
      },
      getSplitRuntime: () => ({
        __switchLocale: async (locale: string) => { switchLog.push(locale) },
      }),
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('fr')
    expect(switchLog).toEqual(['fr'])
  })

  it('setLocale resolves module with default export', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (_locale: string) => {
        return { default: { greeting: 'Hallo' } } as any
      },
    })

    await loader.setLocale('de')
    expect(loader.getMessages()['de']).toEqual({ greeting: 'Hallo' })
  })

  it('setLocale error path — logs error and resets loading', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loadingStates: boolean[] = []

    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async () => {
        throw new Error('Network error')
      },
      onLoadingChange: (loading) => { loadingStates.push(loading) },
    })

    await loader.setLocale('fr')
    expect(loader.getLocale()).toBe('en')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load locale "fr"'),
      expect.any(Error),
    )
    expect(loadingStates).toEqual([true, false])
    expect(loader.isLoading()).toBe(false)
    errorSpy.mockRestore()
  })

  it('setLocale stale error — error is silently discarded', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: {} },
      loadMessages: async (locale: string) => {
        if (locale === 'ja') {
          await delay(30)
          throw new Error('Stale error')
        }
        await delay(5)
        return { greeting: `greeting-${locale}` }
      },
    })

    // ja will throw but after fr has already won
    const p1 = loader.setLocale('ja')
    const p2 = loader.setLocale('fr')
    await Promise.all([p1, p2])

    expect(loader.getLocale()).toBe('fr')
    // The ja error should be silently discarded (thisRequest !== requestId)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('preloadLocale loads messages without switching locale', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages: async (_locale: string) => ({ hello: 'Bonjour' }),
    })

    await loader.preloadLocale('fr')
    expect(loader.getLocale()).toBe('en')
    expect(loader.getMessages()['fr']).toEqual({ hello: 'Bonjour' })
    expect(loader.getLoadedLocales().has('fr')).toBe(true)
  })

  it('preloadLocale skips already loaded locale', async () => {
    let loadCount = 0
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      loadMessages: async () => { loadCount++; return { hello: 'Bonjour' } },
    })

    await loader.preloadLocale('en')
    expect(loadCount).toBe(0) // Already loaded, should skip
  })

  it('preloadLocale skips when no loadMessages', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    await loader.preloadLocale('fr')
    // Should do nothing since no loadMessages function
    expect(loader.getLoadedLocales().has('fr')).toBe(false)
  })

  it('preloadLocale with split runtime __preloadLocale', async () => {
    const preloadLog: string[] = []
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (_locale: string) => ({ hello: 'Bonjour' }),
      getSplitRuntime: () => ({
        __preloadLocale: async (locale: string) => { preloadLog.push(locale) },
      }),
    })

    await loader.preloadLocale('fr')
    expect(preloadLog).toEqual(['fr'])
  })

  it('preloadLocale with default export module', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async () => ({ default: { hello: 'Hallo' } } as any),
    })

    await loader.preloadLocale('de')
    expect(loader.getMessages()['de']).toEqual({ hello: 'Hallo' })
  })

  it('preloadLocale error path — warns and does not crash', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async () => { throw new Error('preload failed') },
    })

    await loader.preloadLocale('fr')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('preload failed for locale "fr"'),
      expect.any(Error),
    )
    expect(loader.getLoadedLocales().has('fr')).toBe(false)
    warnSpy.mockRestore()
  })

  it('loadMessages (sync) stores and merges messages', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { a: 'Alpha' } },
    })

    loader.loadMessages('en', { b: 'Bravo' })
    expect(loader.getMessages()['en']).toEqual({ a: 'Alpha', b: 'Bravo' })
    expect(loader.getLoadedLocales().has('en')).toBe(true)
  })

  it('loadMessages (sync) creates new locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { a: 'Alpha' } },
    })

    loader.loadMessages('fr', { hello: 'Bonjour' })
    expect(loader.getMessages()['fr']).toEqual({ hello: 'Bonjour' })
    expect(loader.getLoadedLocales().has('fr')).toBe(true)
  })

  it('te returns true when key exists', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(loader.te('hello')).toBe(true)
    expect(loader.te('missing')).toBe(false)
  })

  it('te with explicit locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { bonjour: 'Bonjour' },
      },
    })

    expect(loader.te('bonjour', 'fr')).toBe(true)
    expect(loader.te('hello', 'fr')).toBe(false)
  })

  it('te returns false for non-existent locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(loader.te('hello', 'ja')).toBe(false)
  })

  it('tm returns compiled message when key exists', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(loader.tm('hello')).toBe('Hello')
    expect(loader.tm('missing')).toBeUndefined()
  })

  it('tm with explicit locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { bonjour: 'Bonjour' },
      },
    })

    expect(loader.tm('bonjour', 'fr')).toBe('Bonjour')
    expect(loader.tm('hello', 'fr')).toBeUndefined()
  })

  it('tm returns undefined for non-existent locale', () => {
    const loader = createLocaleLoader({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    expect(loader.tm('hello', 'ja')).toBeUndefined()
  })
})

describe('createLocaleLoader — stale after __switchLocale', () => {
  it('superseded during __switchLocale: first call is discarded after switchLocale', async () => {
    // This test covers the re-check guard at line 119 of locale-loader.ts:
    // After loadMessages succeeds but during the slow __switchLocale,
    // a second setLocale fires and wins. The first call should be discarded.
    const localeChanges: string[] = []
    let secondCallFired = false

    const loader = createLocaleLoader({
      locale: 'en',
      // Both locales load messages quickly
      loadMessages: async (locale: string) => {
        await delay(5)
        return { greeting: `greeting-${locale}` }
      },
      getSplitRuntime: () => ({
        __switchLocale: async (locale: string) => {
          if (locale === 'ja') {
            // During ja's slow __switchLocale, fire the second setLocale
            if (!secondCallFired) {
              secondCallFired = true
              // This simulates a user clicking 'fr' while 'ja' is still switching
              await delay(50)
            }
          } else {
            await delay(5)
          }
        },
      }),
      onLocaleChange: (locale) => { localeChanges.push(locale) },
    })

    // Start ja first (fast loadMessages, slow __switchLocale)
    const p1 = loader.setLocale('ja')
    // Wait for ja's loadMessages to complete, then fire fr
    await delay(10)
    const p2 = loader.setLocale('fr')

    await Promise.all([p1, p2])

    // fr should win — ja was superseded during __switchLocale
    expect(loader.getLocale()).toBe('fr')
    expect(localeChanges).toEqual(['fr'])
  })
})

describe('createLocaleLoader — race condition after __switchLocale', () => {
  it('concurrent setLocale calls: only the last caller wins', async () => {
    // Regression test: after `await splitRuntime.__switchLocale(newLocale)`,
    // the loader must re-check if a newer setLocale() call has superseded
    // the current one. Without the guard, a slow first call would overwrite
    // the locale set by a faster second call.

    const switchLocaleLog: string[] = []

    const loader = createLocaleLoader({
      locale: 'en',
      // Simulate slow message loading — 'ja' is slower than 'fr'
      loadMessages: async (locale: string) => {
        if (locale === 'ja') await delay(40)
        if (locale === 'fr') await delay(10)
        return { greeting: `greeting-${locale}` }
      },
      // Simulate a slow __switchLocale for the first call ('ja')
      getSplitRuntime: () => ({
        __switchLocale: async (locale: string) => {
          switchLocaleLog.push(locale)
          if (locale === 'ja') await delay(40)
          if (locale === 'fr') await delay(10)
        },
      }),
    })

    // Fire both calls without awaiting — simulates rapid user clicks
    const p1 = loader.setLocale('ja')
    const p2 = loader.setLocale('fr')

    await Promise.all([p1, p2])

    // The final locale MUST be 'fr' (the last call), not 'ja'
    expect(loader.getLocale()).toBe('fr')
  })

  it('stale loadMessages result is discarded when superseded', async () => {
    const localeChanges: string[] = []

    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (locale: string) => {
        // 'ja' takes much longer to load than 'fr'
        if (locale === 'ja') await delay(60)
        if (locale === 'fr') await delay(10)
        return { greeting: `greeting-${locale}` }
      },
      onLocaleChange: (locale) => { localeChanges.push(locale) },
    })

    const p1 = loader.setLocale('ja')
    const p2 = loader.setLocale('fr')

    await Promise.all([p1, p2])

    // 'fr' finishes first and wins; 'ja' finishes later but is discarded
    expect(loader.getLocale()).toBe('fr')
    // onLocaleChange should have been called only for 'fr'
    expect(localeChanges).toEqual(['fr'])
  })

  it('three rapid setLocale calls — only the last locale is active', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (locale: string) => {
        if (locale === 'ja') await delay(50)
        if (locale === 'de') await delay(30)
        if (locale === 'fr') await delay(10)
        return { greeting: `greeting-${locale}` }
      },
      getSplitRuntime: () => ({
        __switchLocale: async (_locale: string) => {
          await delay(5)
        },
      }),
    })

    const p1 = loader.setLocale('ja')
    const p2 = loader.setLocale('de')
    const p3 = loader.setLocale('fr')

    await Promise.all([p1, p2, p3])

    expect(loader.getLocale()).toBe('fr')
  })

  it('loading state is cleaned up correctly after race', async () => {
    const loader = createLocaleLoader({
      locale: 'en',
      loadMessages: async (locale: string) => {
        if (locale === 'ja') await delay(40)
        if (locale === 'fr') await delay(10)
        return { greeting: `greeting-${locale}` }
      },
    })

    const p1 = loader.setLocale('ja')
    const p2 = loader.setLocale('fr')

    await Promise.all([p1, p2])

    // Loading should be false — the winning request finished
    expect(loader.isLoading()).toBe(false)
    expect(loader.getLocale()).toBe('fr')
  })
})
