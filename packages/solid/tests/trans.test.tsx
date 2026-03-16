import { describe, it, expect, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import type { JSX } from 'solid-js'
import { I18nProvider, Trans } from '../src'

describe('Trans component', () => {
  // ─── Legacy message prop (deprecated) ───────────────────────────────

  it('renders plain text message', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans message="Hello world" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello world')
  })

  it('interpolates values in plain text', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans message="Hello {name}" values={{ name: 'Alice' }} />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello Alice')
  })

  it('renders rich text with components prop', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Read the <link>terms</link> and <bold>conditions</bold>"
          components={{
            link: (props: { children?: JSX.Element }) => (
              <a href="/terms">{props.children}</a>
            ),
            bold: (props: { children?: JSX.Element }) => (
              <strong>{props.children}</strong>
            ),
          }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Read the terms and conditions')

    const link = container.querySelector('a')
    expect(link).toBeDefined()
    expect(link?.getAttribute('href')).toBe('/terms')
    expect(link?.textContent).toBe('terms')

    const bold = container.querySelector('strong')
    expect(bold).toBeDefined()
    expect(bold?.textContent).toBe('conditions')
  })

  it('preserves unknown tags as plain text', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello <unknown>world</unknown>"
          components={{}}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello <unknown>world</unknown>')
  })

  it('handles message with no tags and components prop', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="No tags here"
          components={{
            bold: (props: { children?: JSX.Element }) => (
              <strong>{props.children}</strong>
            ),
          }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('No tags here')
  })

  it('combines values interpolation with rich text components', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hi {name}, read <bold>this</bold>"
          values={{ name: 'Bob' }}
          components={{
            bold: (props: { children?: JSX.Element }) => (
              <strong>{props.children}</strong>
            ),
          }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hi Bob, read this')
    expect(container.querySelector('strong')?.textContent).toBe('this')
  })

  it('emits deprecation warning when message prop is used', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans message="Hello world" />
      </I18nProvider>
    ))

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"message" prop is deprecated'),
    )

    warnSpy.mockRestore()
  })

  // ─── Children rendering (recommended API) ───────────────────────────

  it('renders children directly when no message prop', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>Hello world</Trans>
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello world')
  })

  it('renders children with inline HTML elements', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>
          Click <a href="/next">here</a> to continue
        </Trans>
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Click here to continue')
    const link = container.querySelector('a')
    expect(link).toBeDefined()
    expect(link?.getAttribute('href')).toBe('/next')
    expect(link?.textContent).toBe('here')
  })

  it('returns null when no message and no children', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans />
      </I18nProvider>
    ))

    expect(container.innerHTML).toBe('')
  })

  // ─── tag prop ───────────────────────────────────────────────────────

  it('wraps children in default span tag', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>
          <span>first</span>
          <span>second</span>
        </Trans>
      </I18nProvider>
    ))

    const wrapper = container.querySelector('span')
    expect(wrapper).toBeDefined()
    expect(container.textContent).toBe('firstsecond')
  })

  it('wraps children in custom tag', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans tag="div">
          <span>first</span>
          <span>second</span>
        </Trans>
      </I18nProvider>
    ))

    const wrapper = container.querySelector('div')
    expect(wrapper).toBeDefined()
    expect(wrapper?.tagName.toLowerCase()).toBe('div')
    expect(container.textContent).toBe('firstsecond')
  })

  it('unwraps single child element', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>
          <strong>only child</strong>
        </Trans>
      </I18nProvider>
    ))

    // Single child should be unwrapped (no extra span wrapper)
    // The direct child of the container div should be the strong element
    const strong = container.querySelector('strong')
    expect(strong).toBeDefined()
    expect(strong?.textContent).toBe('only child')
  })

  // ─── XSS prevention ──────────────────────────────────────────────────

  it('escapes HTML in interpolated values', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello {name}"
          values={{ name: '<img src=x onerror="alert(1)">' }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
    expect(container.querySelector('img')).toBeNull()
  })

  it('escapes script tags in interpolated values', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello {name}"
          values={{ name: '<script>alert("xss")</script>' }}
        />
      </I18nProvider>
    ))

    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert("xss")</script>')
  })

  it('does not execute injected HTML in message with components', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message='Read <link>terms</link><img src=x onerror="alert(1)">'
          components={{
            link: (props: { children?: JSX.Element }) => (
              <a href="/terms">{props.children}</a>
            ),
          }}
        />
      </I18nProvider>
    ))

    // The <img> tag should be rendered as text, not as an element
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('a')).toBeDefined()
    expect(container.querySelector('a')?.textContent).toBe('terms')
  })

  it('unknown tags in message render as plain text', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello <script>alert(1)</script>"
          components={{}}
        />
      </I18nProvider>
    ))

    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('renders empty string when children is an empty string', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>{''}</Trans>
      </I18nProvider>
    ))

    expect(container.textContent).toBe('')
  })

  it('renders deeply nested rich text components', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Read <outer>the <inner>important</inner> terms</outer>"
          components={{
            outer: (props: { children?: JSX.Element }) => (
              <div class="outer">{props.children}</div>
            ),
            inner: (props: { children?: JSX.Element }) => (
              <strong class="inner">{props.children}</strong>
            ),
          }}
        />
      </I18nProvider>
    ))

    const outer = container.querySelector('.outer')
    expect(outer).toBeDefined()
    const inner = container.querySelector('.inner')
    expect(inner).toBeDefined()
    expect(inner?.textContent).toBe('important')
    expect(outer?.textContent).toContain('important')
    expect(outer?.textContent).toContain('terms')
  })

  it('prevents XSS via event handler injection in values', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Welcome {user}"
          values={{ user: '"><img src=x onerror=alert(1)>' }}
        />
      </I18nProvider>
    ))

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('"><img src=x onerror=alert(1)>')
  })
})
