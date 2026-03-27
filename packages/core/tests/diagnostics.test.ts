import { describe, it, expect, vi } from 'vitest'
import { createDiagnostics } from '../src/diagnostics'
import { createFluentiCore } from '../src'
import type { DiagnosticEvent } from '../src/diagnostics'

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

// ─── Edge cases — error recovery and boundaries ──────────────────────────

describe('edge cases — error recovery and boundaries', () => {
  it('reporter throws — error is swallowed, missingKey does not throw', () => {
    const diag = createDiagnostics({
      warnMissing: true,
      reporter: () => { throw new Error('reporter boom') },
    })

    // A throwing reporter must not crash t() — the error is silently swallowed
    expect(() => diag.missingKey('en', 'key')).not.toThrow()
  })

  it('events are frozen — mutation throws TypeError', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('en', 'key')
    const event = events[0]!

    // Object.freeze makes the event immutable — assigning should throw in strict mode
    expect(() => {
      (event as any).type = 'format-error'
    }).toThrow(TypeError)

    expect(() => {
      (event as any).locale = 'fr'
    }).toThrow(TypeError)
  })

  it('all 4 event types have correct type field', () => {
    const events: DiagnosticEvent[] = []
    const diag = createDiagnostics({
      warnMissing: true,
      warnFallback: true,
      reporter: (event) => { events.push(event) },
    })

    diag.missingKey('en', 'a')
    diag.fallbackUsed('ja', 'en', 'b')
    diag.parseError('en', 'c', new Error('parse'))
    diag.formatError('en', 'd', new Error('format'))

    expect(events).toHaveLength(4)
    expect(events[0]!.type).toBe('missing-key')
    expect(events[1]!.type).toBe('fallback-used')
    expect(events[2]!.type).toBe('parse-error')
    expect(events[3]!.type).toBe('format-error')

    // Verify each event has the correct locale and messageId
    expect(events[0]!.messageId).toBe('a')
    expect(events[1]!.messageId).toBe('b')
    expect(events[2]!.messageId).toBe('c')
    expect(events[3]!.messageId).toBe('d')

    // Verify error objects on parse-error and format-error
    expect(events[2]!.error).toBeInstanceOf(Error)
    expect(events[3]!.error).toBeInstanceOf(Error)
    expect(events[2]!.error!.message).toBe('parse')
    expect(events[3]!.error!.message).toBe('format')
  })
})

// ─── Integration with createFluentiCore ──────────────────────────────────

describe('diagnostics integration', () => {
  it('fires missingKey event when translation is not found', () => {
    const reporter = vi.fn()
    const diag = createDiagnostics({ warnMissing: true, reporter })
    const i18n = createFluentiCore({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: {} },
      diagnostics: diag,
    })

    i18n.t('nonexistent')
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'missing-key',
        locale: 'en',
        messageId: 'nonexistent',
      }),
    )
  })

  it('fires fallbackUsed event when falling back to another locale', () => {
    const reporter = vi.fn()
    const diag = createDiagnostics({ warnFallback: true, reporter })
    const i18n = createFluentiCore({
      locale: 'ja',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        ja: {},
      },
      diagnostics: diag,
    })

    i18n.t('hello')
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fallback-used',
        locale: 'ja',
        fallbackLocale: 'en',
        messageId: 'hello',
      }),
    )
  })

  it('does not fire when diagnostics is not configured', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: {} },
    })
    // Should not throw
    expect(() => i18n.t('nonexistent')).not.toThrow()
  })

  it('exposes diagnostics instance on the returned object', () => {
    const reporter = vi.fn()
    const diag = createDiagnostics({ reporter })
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      diagnostics: diag,
    })

    expect(i18n.diagnostics).toBeDefined()
    expect(i18n.diagnostics!.enabled).toBe(true)
  })

  it('diagnostics is undefined when not configured', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
    })

    expect(i18n.diagnostics).toBeUndefined()
  })
})

// ─── Duck-typed diagnostics (#5) ──────────────────────────────────────

describe('duck-typed diagnostics', () => {
  it('plain object with { missingKey, fallbackUsed, enabled } works', () => {
    const missingKey = vi.fn()
    const fallbackUsed = vi.fn()
    const duckDiag = { missingKey, fallbackUsed, enabled: true }

    const i18n = createFluentiCore({
      locale: 'ja',
      fallbackLocale: 'en',
      messages: { ja: {}, en: { hello: 'Hello' } },
      diagnostics: duckDiag as any,
    })

    // Trigger fallbackUsed
    i18n.t('hello')
    expect(fallbackUsed).toHaveBeenCalledWith('ja', 'en', 'hello')

    // Trigger missingKey
    i18n.t('nonexistent')
    expect(missingKey).toHaveBeenCalledWith('ja', 'nonexistent')
  })

  it('object WITHOUT missingKey → diag is undefined (duck-type fails)', () => {
    const configLike = { warnMissing: true, reporter: vi.fn() }

    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      diagnostics: configLike as any,
    })

    // The duck-type check ('missingKey' in config.diagnostics) fails
    // so diag is undefined and diagnostics is not exposed
    expect(i18n.diagnostics).toBeUndefined()

    // Should not throw even though diagnostics config doesn't have missingKey
    expect(() => i18n.t('nonexistent')).not.toThrow()
  })

  it('diagnostics on returned instance matches passed object', () => {
    const duckDiag = {
      missingKey: vi.fn(),
      fallbackUsed: vi.fn(),
      enabled: true,
    }

    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      diagnostics: duckDiag as any,
    })

    expect(i18n.diagnostics).toBe(duckDiag)
  })

  it('diagnostics: undefined → instance.diagnostics is undefined', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      messages: { en: {} },
      diagnostics: undefined,
    })

    expect(i18n.diagnostics).toBeUndefined()
  })
})
