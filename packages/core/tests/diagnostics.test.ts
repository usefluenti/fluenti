import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDiagnostics } from '../src/diagnostics'
import type { DiagnosticEvent, DiagnosticsConfig } from '../src/diagnostics'
import { createFluent } from '../src/index'

describe('createDiagnostics', () => {
  it('creates an enabled diagnostics instance in dev mode', () => {
    const diag = createDiagnostics({ warnMissing: true })
    expect(diag.enabled).toBe(true)
  })

  it('reports missing key events via custom reporter', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      warnMissing: true,
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('ja', 'greeting')

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('missing-key')
    expect(events[0]!.locale).toBe('ja')
    expect(events[0]!.messageId).toBe('greeting')
    expect(events[0]!.timestamp).toBeTypeOf('number')
    expect(events[0]!.timestamp).toBeGreaterThan(0)
  })

  it('reports fallback-used events via custom reporter', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      warnFallback: true,
      reporter: (event) => { events.push(event) },
    })

    diag.fallbackUsed('ja', 'en', 'greeting')

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('fallback-used')
    expect(events[0]!.locale).toBe('ja')
    expect(events[0]!.fallbackLocale).toBe('en')
    expect(events[0]!.messageId).toBe('greeting')
  })

  it('reports parse-error events with error object', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    const err = new Error('bad syntax')
    diag.parseError('en', 'broken-msg', err)

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('parse-error')
    expect(events[0]!.error).toBe(err)
    expect(events[0]!.messageId).toBe('broken-msg')
  })

  it('reports format-error events with error object', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    const err = new Error('format failure')
    diag.formatError('en', 'num-msg', err)

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('format-error')
    expect(events[0]!.error).toBe(err)
  })

  it('does not fire missing key events when warnMissing is false', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      warnMissing: false,
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('en', 'greeting')
    expect(events).toHaveLength(0)
  })

  it('does not fire fallback events when warnFallback is false', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      warnFallback: false,
      reporter: (event) => { events.push(event) },
    })

    diag.fallbackUsed('ja', 'en', 'greeting')
    expect(events).toHaveLength(0)
  })

  it('defaults warnMissing and warnFallback to true', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('en', 'a')
    diag.fallbackUsed('ja', 'en', 'b')
    expect(events).toHaveLength(2)
  })

  it('uses console.warn as default reporter', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const diag = createDiagnostics({ warnMissing: true })

    diag.missingKey('en', 'test-key')

    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0]![0]).toContain('test-key')
    warnSpy.mockRestore()
  })

  it('produces frozen (immutable) event objects', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('en', 'key')
    expect(Object.isFrozen(events[0])).toBe(true)
  })

  it('event shape includes all required fields', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    diag.fallbackUsed('ja', 'en', 'greeting')

    const event = events[0]!
    expect(event).toHaveProperty('type')
    expect(event).toHaveProperty('locale')
    expect(event).toHaveProperty('messageId')
    expect(event).toHaveProperty('fallbackLocale')
    expect(event).toHaveProperty('timestamp')
    expect(event.type).toBe('fallback-used')
    expect(event.locale).toBe('ja')
    expect(event.messageId).toBe('greeting')
    expect(event.fallbackLocale).toBe('en')
    expect(typeof event.timestamp).toBe('number')
  })
})

describe('createFluent with diagnostics', () => {
  let events: DiagnosticEvent[]
  let diagnosticsConfig: DiagnosticsConfig

  beforeEach(() => {
    events = []
    diagnosticsConfig = {
      warnMissing: true,
      warnFallback: true,
      reporter: (event) => { events.push(event) },
    }
  })

  it('fires missing-key when a key is not found', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
      diagnostics: diagnosticsConfig,
    })

    i18n.t('nonexistent')

    const missingEvents = events.filter((e) => e.type === 'missing-key')
    expect(missingEvents).toHaveLength(1)
    expect(missingEvents[0]!.messageId).toBe('nonexistent')
    expect(missingEvents[0]!.locale).toBe('en')
  })

  it('fires fallback-used when fallbackLocale provides the translation', () => {
    const i18n = createFluent({
      locale: 'ja',
      fallbackLocale: 'en',
      messages: {
        ja: {},
        en: { greeting: 'Hello' },
      },
      diagnostics: diagnosticsConfig,
    })

    const result = i18n.t('greeting')
    expect(result).toBe('Hello')

    const fallbackEvents = events.filter((e) => e.type === 'fallback-used')
    expect(fallbackEvents).toHaveLength(1)
    expect(fallbackEvents[0]!.locale).toBe('ja')
    expect(fallbackEvents[0]!.fallbackLocale).toBe('en')
    expect(fallbackEvents[0]!.messageId).toBe('greeting')
  })

  it('fires fallback-used when fallbackChain provides the translation', () => {
    const i18n = createFluent({
      locale: 'zh-CN',
      messages: {
        'zh-CN': {},
        en: { greeting: 'Hello' },
      },
      fallbackChain: { 'zh-CN': ['en'] },
      diagnostics: diagnosticsConfig,
    })

    const result = i18n.t('greeting')
    expect(result).toBe('Hello')

    const fallbackEvents = events.filter((e) => e.type === 'fallback-used')
    expect(fallbackEvents).toHaveLength(1)
    expect(fallbackEvents[0]!.fallbackLocale).toBe('en')
  })

  it('does not fire diagnostics when key is found in primary locale', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: { greeting: 'Hello' } },
      diagnostics: diagnosticsConfig,
    })

    i18n.t('greeting')
    expect(events).toHaveLength(0)
  })

  it('works without diagnostics config (no errors)', () => {
    const i18n = createFluent({
      locale: 'en',
      messages: { en: {} },
    })

    // Should not throw
    expect(i18n.t('missing')).toBe('missing')
  })
})
