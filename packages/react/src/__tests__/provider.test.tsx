import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { createElement, useContext, useEffect, useState } from 'react'
import { I18nProvider } from '../provider'
import { I18nContext } from '../context'
import { useI18n } from '../hooks/useI18n'
import { clearGlobalI18n, getGlobalI18n } from '../global-registry'
import type { I18nContextValue } from '../types'

describe('I18nProvider edge cases', () => {
  afterEach(() => {
    cleanup()
    clearGlobalI18n()
  })

  // 1. No messages prop (empty default)
  it('works without messages prop (empty default)', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      return createElement('div', { 'data-testid': 'locale' }, ctx.locale)
    }

    render(
      createElement(I18nProvider, { locale: 'en', children: null },
        createElement(Consumer),
      ),
    )
    expect(screen.getByTestId('locale').textContent).toBe('en')
  })

  // 2. Fast consecutive setLocale (race discards old result)
  it('discards stale results on fast consecutive setLocale calls', async () => {
    let resolveFirst: ((v: Record<string, string>) => void) | null = null
    let resolveSecond: ((v: Record<string, string>) => void) | null = null
    let callCount = 0

    const loadMessages = vi.fn((_locale: string) => {
      callCount++
      if (callCount === 1) {
        return new Promise<Record<string, string>>((resolve) => {
          resolveFirst = resolve
        })
      }
      return new Promise<Record<string, string>>((resolve) => {
        resolveSecond = resolve
      })
    })

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'race-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'race-ja',
          onClick: () => ctx.setLocale('ja'),
        }, 'ja'),
        createElement('button', {
          'data-testid': 'race-zh',
          onClick: () => ctx.setLocale('zh'),
        }, 'zh'),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    // Trigger two locale switches quickly
    await act(async () => {
      screen.getByTestId('race-ja').click()
    })
    await act(async () => {
      screen.getByTestId('race-zh').click()
    })

    // Resolve second (newer) first
    await act(async () => {
      resolveSecond!({ greeting: 'zh-greeting' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('race-locale').textContent).toBe('zh')
    })

    // Now resolve the stale first one — should NOT change locale
    await act(async () => {
      resolveFirst!({ greeting: 'ja-greeting' })
    })

    expect(screen.getByTestId('race-locale').textContent).toBe('zh')
  })

  // 3. loadMessages returns { default: Messages } module format
  it('handles loadMessages returning { default: Messages } module format', async () => {
    const loadMessages = vi.fn(async () => ({
      default: { greeting: 'Hola' },
    }))

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'mod-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'mod-switch',
          onClick: () => ctx.setLocale('es'),
        }, 'switch'),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    await act(async () => {
      screen.getByTestId('mod-switch').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('mod-locale').textContent).toBe('es')
    })
  })

  // 4. locale prop external change triggers internal update
  it('syncs internal locale when external locale prop changes', async () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      return createElement('div', { 'data-testid': 'ext-locale' }, ctx.locale)
    }

    const loadMessages = vi.fn(async (locale: string) => ({
      greeting: `hello-${locale}`,
    }))

    function Wrapper() {
      const [loc, setLoc] = useState('en')
      return createElement('div', null,
        createElement('button', {
          'data-testid': 'ext-change',
          onClick: () => setLoc('fr'),
        }, 'change'),
        createElement(I18nProvider, { locale: loc, messages: { en: {} }, loadMessages, children: null },
          createElement(Consumer),
        ),
      )
    }

    render(createElement(Wrapper))
    expect(screen.getByTestId('ext-locale').textContent).toBe('en')

    await act(async () => {
      screen.getByTestId('ext-change').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('ext-locale').textContent).toBe('fr')
    })
  })

  // 5. Unmount during async load (no setState)
  it('does not crash when unmounted during async load', async () => {
    let resolveLoad: (() => void) | null = null
    const loadMessages = vi.fn(() =>
      new Promise<Record<string, string>>((resolve) => {
        resolveLoad = () => resolve({ greeting: 'hi' })
      }),
    )

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      useEffect(() => {
        void ctx.setLocale('ja')
      }, [])
      return createElement('span', null, 'child')
    }

    const { unmount } = render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    // Unmount before resolving
    unmount()

    // Resolve after unmount — should not cause errors
    await act(async () => {
      resolveLoad?.()
    })
  })

  // 6. preloadLocale already loaded locale (no-op)
  it('preloadLocale is a no-op for already loaded locale', async () => {
    const loadMessages = vi.fn(async () => ({ greeting: 'hi' }))

    function Preloader() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('button', {
        'data-testid': 'pre-btn',
        onClick: () => ctx.preloadLocale('en'),
      }, 'preload')
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: { greeting: 'Hello' } }, loadMessages, children: null },
        createElement(Preloader),
      ),
    )

    await act(async () => {
      screen.getByTestId('pre-btn').click()
    })

    expect(loadMessages).not.toHaveBeenCalled()
  })

  // 7. preloadLocale error silent
  it('preloadLocale silently swallows errors', async () => {
    const loadMessages = vi.fn(async () => {
      throw new Error('network error')
    })

    function Preloader() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('button', {
        'data-testid': 'pre-err',
        onClick: () => ctx.preloadLocale('ja'),
      }, 'preload')
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Preloader),
      ),
    )

    // Should not throw
    await act(async () => {
      screen.getByTestId('pre-err').click()
    })

    // If we get here, the error was silently swallowed
    expect(loadMessages).toHaveBeenCalledWith('ja')
  })

  // 8. Convenience methods produce correct values (not just exist)
  it('t() returns same result as i18n.t()', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      const viaCtx = ctx.t('greeting')
      const viaI18n = ctx.i18n.t('greeting')
      return createElement('div', null,
        createElement('span', { 'data-testid': 'via-ctx' }, viaCtx),
        createElement('span', { 'data-testid': 'via-i18n' }, viaI18n),
        createElement('span', { 'data-testid': 'match' }, String(viaCtx === viaI18n)),
      )
    }

    render(
      createElement(I18nProvider, {
        locale: 'en',
        messages: { en: { greeting: 'Hello World' } },
        children: null,
      },
        createElement(Consumer),
      ),
    )

    expect(screen.getByTestId('via-ctx').textContent).toBe('Hello World')
    expect(screen.getByTestId('match').textContent).toBe('true')
  })

  // 9. d() formats dates correctly
  it('d() formats a date using Intl.DateTimeFormat', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      return createElement('span', { 'data-testid': 'd-out' }, ctx.d(new Date(2025, 0, 15)))
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, children: null },
        createElement(Consumer),
      ),
    )

    const text = screen.getByTestId('d-out').textContent!
    // Must contain "2025" and "1" or "Jan" (month) — not just truthy
    expect(text).toContain('2025')
    expect(text).toMatch(/Jan|1/)
  })

  // 10. n() formats numbers correctly
  it('n() formats a number with locale separators', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      return createElement('span', { 'data-testid': 'n-out' }, ctx.n(1234.5))
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, children: null },
        createElement(Consumer),
      ),
    )

    const text = screen.getByTestId('n-out').textContent!
    // English locale: "1,234.5"
    expect(text).toContain('1')
    expect(text).toContain('234')
    expect(text).toContain('.5')
  })

  // 11. format() performs ICU interpolation without catalog lookup
  it('format() interpolates ICU message strings', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      return createElement('div', null,
        createElement('span', { 'data-testid': 'fmt-simple' },
          ctx.format('Hello, {name}!', { name: 'Alice' })),
        createElement('span', { 'data-testid': 'fmt-plural' },
          ctx.format('{count, plural, one {# item} other {# items}}', { count: 5 })),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, children: null },
        createElement(Consumer),
      ),
    )

    expect(screen.getByTestId('fmt-simple').textContent).toBe('Hello, Alice!')
    expect(screen.getByTestId('fmt-plural').textContent).toBe('5 items')
  })

  // 12. loadMessages() merges messages and getLocales() reflects update
  it('loadMessages() merges messages; getLocales() returns updated list', () => {
    let capturedCtx: Pick<I18nContextValue, 'loadMessages' | 'getLocales'> | null = null

    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      capturedCtx = ctx
      return createElement('span', { 'data-testid': 'lm-locales' }, ctx.getLocales().join(','))
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: { greeting: 'Hello' } }, children: null },
        createElement(Consumer),
      ),
    )

    expect(screen.getByTestId('lm-locales').textContent).toBe('en')

    // Merge ja messages via the context method
    act(() => {
      capturedCtx!.loadMessages('ja', { greeting: 'こんにちは' })
    })

    // After loadMessages, getLocales should include 'ja'
    expect(capturedCtx!.getLocales()).toContain('ja')
    expect(capturedCtx!.getLocales()).toContain('en')
  })

  // 13. t() works with MessageDescriptor (msg`` lazy messages)
  it('t() resolves MessageDescriptor objects', () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return createElement('div', null, 'no context')
      const descriptor = { id: 'greeting', message: 'Hello' }
      return createElement('span', { 'data-testid': 'desc-out' }, ctx.t(descriptor))
    }

    render(
      createElement(I18nProvider, {
        locale: 'en',
        messages: { en: { greeting: 'Howdy' } },
        children: null,
      },
        createElement(Consumer),
      ),
    )

    expect(screen.getByTestId('desc-out').textContent).toBe('Howdy')
  })

  // 14. Convenience methods update after locale switch (binding correctness)
  it('convenience methods use latest i18n instance after locale switch', async () => {
    function Consumer() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'sw-t' }, ctx.t('greeting')),
        createElement('span', { 'data-testid': 'sw-d' }, ctx.d(new Date(2025, 0, 15))),
        createElement('span', { 'data-testid': 'sw-n' }, ctx.n(1234.5)),
        createElement('span', { 'data-testid': 'sw-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'sw-btn',
          onClick: () => ctx.setLocale('ja'),
        }, 'switch'),
      )
    }

    const loadMessages = vi.fn(async () => ({
      greeting: 'こんにちは',
    }))

    render(
      createElement(I18nProvider, {
        locale: 'en',
        messages: { en: { greeting: 'Hello' } },
        loadMessages,
        children: null,
      },
        createElement(Consumer),
      ),
    )

    // Before switch — English
    expect(screen.getByTestId('sw-t').textContent).toBe('Hello')
    expect(screen.getByTestId('sw-locale').textContent).toBe('en')

    await act(async () => {
      screen.getByTestId('sw-btn').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('sw-locale').textContent).toBe('ja')
    })

    // After switch — t() should use the new catalog
    expect(screen.getByTestId('sw-t').textContent).toBe('こんにちは')
    // d() and n() should still produce valid output (not throw)
    expect(screen.getByTestId('sw-d').textContent).toBeTruthy()
    expect(screen.getByTestId('sw-n').textContent).toBeTruthy()
  })

  // 15. useI18n() throws outside provider
  it('useI18n() throws when used outside I18nProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Bare() {
      const ctx = useI18n()
      return createElement('span', null, ctx.locale)
    }

    expect(() => render(createElement(Bare))).toThrow('[fluenti] useI18n()')
    spy.mockRestore()
  })

  // 16. useI18n() returns convenience methods
  it('useI18n() returns all convenience methods alongside i18n', () => {
    function Consumer() {
      const ctx = useI18n()
      return createElement('div', null,
        createElement('span', { 'data-testid': 'hook-t' }, ctx.t('greeting')),
        createElement('span', { 'data-testid': 'hook-has-d' }, String(typeof ctx.d)),
        createElement('span', { 'data-testid': 'hook-has-n' }, String(typeof ctx.n)),
        createElement('span', { 'data-testid': 'hook-has-format' }, String(typeof ctx.format)),
        createElement('span', { 'data-testid': 'hook-has-i18n' }, String(typeof ctx.i18n.t)),
      )
    }

    render(
      createElement(I18nProvider, {
        locale: 'en',
        messages: { en: { greeting: 'Hi' } },
        children: null,
      },
        createElement(Consumer),
      ),
    )

    expect(screen.getByTestId('hook-t').textContent).toBe('Hi')
    expect(screen.getByTestId('hook-has-d').textContent).toBe('function')
    expect(screen.getByTestId('hook-has-n').textContent).toBe('function')
    expect(screen.getByTestId('hook-has-format').textContent).toBe('function')
    expect(screen.getByTestId('hook-has-i18n').textContent).toBe('function')
  })

  // 17. Sets global i18n instance via registry
  it('sets global i18n instance via registry', () => {
    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, children: null },
        createElement('div', null, 'child'),
      ),
    )

    const global = getGlobalI18n()
    expect(global).toBeDefined()
    expect(typeof global!.t).toBe('function')
  })
})
