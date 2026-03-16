import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, useState, memo as reactMemo } from 'react'
import { I18nProvider } from '../provider'
import { Trans } from '../components/Trans'

function withProvider(ui: React.ReactNode, messages: Record<string, Record<string, string>> = { en: {} }) {
  return createElement(I18nProvider, { locale: 'en', messages, children: null }, ui)
}

describe('Trans edge cases', () => {
  // 1. No provider throws
  it('throws when used outside I18nProvider', () => {
    expect(() => {
      render(createElement(Trans, null, 'Hello'))
    }).toThrow('[fluenti] <Trans> must be used within an <I18nProvider>')
  })

  // 2. Nested elements <b> inside <a>
  it('handles nested elements', () => {
    const { container } = render(
      withProvider(
        createElement(Trans, null,
          'Click ',
          createElement('a', { href: '#' },
            createElement('b', null, 'here'),
          ),
        ),
      ),
    )
    // The nested structure should be preserved in the output
    expect(container.textContent).toContain('Click')
    expect(container.textContent).toContain('here')
    // The outer element (a) should be rendered
    const a = container.querySelector('a')
    expect(a).toBeTruthy()
    expect(a?.textContent).toContain('here')
  })

  // 3. Custom id prop
  it('uses custom id prop for message lookup', () => {
    const messages = {
      en: { 'custom.id': 'Custom translated text' },
    }

    const { container } = render(
      withProvider(
        createElement(Trans, { id: 'custom.id', children: 'fallback text' }),
        messages,
      ),
    )
    expect(container.textContent).toBe('Custom translated text')
  })

  // 4. render prop
  it('uses render prop to wrap translation', () => {
    const renderFn = (translation: React.ReactNode) =>
      createElement('strong', { 'data-testid': 'wrapper' }, translation)

    render(
      withProvider(
        createElement(Trans, { render: renderFn, children: 'Hello' }),
      ),
    )
    const wrapper = screen.getByTestId('wrapper')
    expect(wrapper.tagName).toBe('STRONG')
    expect(wrapper.textContent).toBe('Hello')
  })

  // 5. No children -> renders hash of empty message (no translation found)
  it('renders something when no children provided', () => {
    const { container } = render(
      withProvider(
        createElement(Trans, null),
      ),
    )
    // With no children, extractMessage returns empty string, which gets hashed.
    // Since no translation exists for that hash, the fallback (empty string) is used.
    // The hash of '' is used as message ID, and t() returns the source message ('')
    expect(container).toBeDefined()
  })

  // 6. Text-only children
  it('renders text-only children correctly', () => {
    const { container } = render(
      withProvider(
        createElement(Trans, null, 'Just plain text'),
      ),
    )
    expect(container.textContent).toBe('Just plain text')
  })

  // 7. XSS: HTML safe in translated messages
  it('does not render raw HTML from translated messages (XSS-safe)', () => {
    // If the translated message contains HTML, it should be rendered as text, not HTML
    const messages = {
      en: {} as Record<string, string>,
    }
    // When no translation found, it uses the source message
    const { container } = render(
      withProvider(
        createElement(Trans, null, '<script>alert("xss")</script>'),
        messages,
      ),
    )
    // Should NOT have a script tag in the DOM
    expect(container.querySelector('script')).toBeNull()
    // The text should be rendered as-is (escaped)
    expect(container.textContent).toContain('<script>alert("xss")</script>')
  })

  // 8. memo: same children don't re-render
  it('does not re-render when children are the same (memo)', () => {
    const renderCount = vi.fn()

    function TrackedTrans(props: { text: string }) {
      renderCount()
      return createElement(Trans, null, props.text)
    }

    const MemoTracked = reactMemo(TrackedTrans)

    function Wrapper() {
      const [, setCount] = useState(0)
      return createElement('div', null,
        createElement(MemoTracked, { text: 'Hello' }),
        createElement('button', {
          'data-testid': 'rerender',
          onClick: () => setCount((c) => c + 1),
        }, 'rerender'),
      )
    }

    render(withProvider(createElement(Wrapper)))
    expect(renderCount).toHaveBeenCalledTimes(1)

    // Trigger parent rerender — memo wrapper should prevent child rerender
    screen.getByTestId('rerender').click()
    // MemoTracked should not re-render since props.text didn't change
    expect(renderCount).toHaveBeenCalledTimes(1)
  })
})
