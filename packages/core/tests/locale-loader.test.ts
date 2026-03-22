import { describe, it, expect, vi } from 'vitest'
import { createFluentiCore } from '../src/index'

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
