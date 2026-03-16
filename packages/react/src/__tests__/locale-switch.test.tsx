import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { createElement, useContext } from 'react'
import { I18nProvider } from '../provider'
import { I18nContext } from '../context'

describe('locale-switch edge cases', () => {
  afterEach(() => {
    cleanup()
  })

  // 1. Lazy load switch
  it('switches locale via lazy loading', async () => {
    const loadMessages = vi.fn(async (locale: string) => ({
      greeting: `Hello-${locale}`,
    }))

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'ls-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'ls-switch',
          onClick: () => ctx.setLocale('ja'),
        }, 'switch'),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    expect(screen.getByTestId('ls-locale').textContent).toBe('en')

    await act(async () => {
      screen.getByTestId('ls-switch').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('ls-locale').textContent).toBe('ja')
    })

    expect(loadMessages).toHaveBeenCalledWith('ja')
  })

  // 2. Switch race condition
  it('handles race condition: only last locale wins', async () => {
    let resolveJa: ((v: Record<string, string>) => void) | null = null
    let resolveZh: ((v: Record<string, string>) => void) | null = null
    let callCount = 0

    const loadMessages = vi.fn((_locale: string) => {
      callCount++
      if (callCount === 1) {
        return new Promise<Record<string, string>>((resolve) => {
          resolveJa = resolve
        })
      }
      return new Promise<Record<string, string>>((resolve) => {
        resolveZh = resolve
      })
    })

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'rc-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'rc-ja',
          onClick: () => ctx.setLocale('ja'),
        }),
        createElement('button', {
          'data-testid': 'rc-zh',
          onClick: () => ctx.setLocale('zh'),
        }),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: {} }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    // Fire ja then zh quickly
    await act(async () => {
      screen.getByTestId('rc-ja').click()
    })
    await act(async () => {
      screen.getByTestId('rc-zh').click()
    })

    // Resolve zh first (the one we want)
    await act(async () => {
      resolveZh!({ greeting: 'zh' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('rc-locale').textContent).toBe('zh')
    })

    // Now resolve ja (stale) — should NOT change locale back to ja
    await act(async () => {
      resolveJa!({ greeting: 'ja' })
    })

    expect(screen.getByTestId('rc-locale').textContent).toBe('zh')
  })

  // 3. Switch to current locale (no-op)
  it('switching to current locale is a no-op', async () => {
    const loadMessages = vi.fn(async () => ({ greeting: 'hi' }))

    function Switcher() {
      const ctx = useContext(I18nContext)
      if (!ctx) return null
      return createElement('div', null,
        createElement('span', { 'data-testid': 'noop-locale' }, ctx.locale),
        createElement('button', {
          'data-testid': 'noop-switch',
          onClick: () => ctx.setLocale('en'),
        }),
      )
    }

    render(
      createElement(I18nProvider, { locale: 'en', messages: { en: { greeting: 'Hello' } }, loadMessages, children: null },
        createElement(Switcher),
      ),
    )

    await act(async () => {
      screen.getByTestId('noop-switch').click()
    })

    // Already on 'en' with messages loaded, so loadMessages should NOT be called
    expect(loadMessages).not.toHaveBeenCalled()
    expect(screen.getByTestId('noop-locale').textContent).toBe('en')
  })
})
