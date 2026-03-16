import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { createElement, useContext, useEffect, useState } from 'react'
import { I18nProvider } from '../provider'
import { I18nContext } from '../context'

describe('I18nProvider edge cases', () => {
  afterEach(() => {
    cleanup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).__fluenti_i18n
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

  // 8. Sets globalThis.__fluenti_i18n
  it('sets globalThis.__fluenti_i18n', () => {
    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, children: null },
        createElement('div', null, 'child'),
      ),
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((globalThis as any).__fluenti_i18n).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (globalThis as any).__fluenti_i18n.t).toBe('function')
  })
})
