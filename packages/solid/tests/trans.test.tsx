import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import type { Component, JSX } from 'solid-js'
import { hashMessage } from '@fluenti/core'
import { I18nProvider, Trans } from '../src'

describe('Trans component', () => {
  // ─── Children rendering (recommended API) ───────────────────────────

  it('renders children directly', () => {
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

  it('returns null when no children', () => {
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

    const strong = container.querySelector('strong')
    expect(strong).toBeDefined()
    expect(strong?.textContent).toBe('only child')
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

  // ─── message + components API ──────────────────────────────────────

  const Bold: Component<{ children?: JSX.Element }> = (props) => (
    <strong>{props.children}</strong>
  )
  const Italic: Component<{ children?: JSX.Element }> = (props) => (
    <em>{props.children}</em>
  )
  const Link: Component<{ children?: JSX.Element }> = (props) => (
    <a href="#">{props.children}</a>
  )

  const richComponents = { bold: Bold, italic: Italic, link: Link }

  it('renders message with a single named component', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello <bold>world</bold>!"
          components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello world!')
    const strong = container.querySelector('strong')
    expect(strong).toBeDefined()
    expect(strong?.textContent).toBe('world')
  })

  it('renders message with multiple named components', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Welcome to <bold>Fluenti</bold> for <italic>SolidJS</italic>!"
          components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Welcome to Fluenti for SolidJS!')
    expect(container.querySelector('strong')?.textContent).toBe('Fluenti')
    expect(container.querySelector('em')?.textContent).toBe('SolidJS')
  })

  it('renders message with nested components', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="You can <bold>nest <italic>components</italic> inside</bold> each other."
          components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('You can nest components inside each other.')
    const strong = container.querySelector('strong')
    expect(strong).toBeDefined()
    expect(strong?.querySelector('em')?.textContent).toBe('components')
  })

  it('renders plain text message without tags', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Just plain text"
          components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Just plain text')
  })

  it('renders unknown tag names as plain text', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello <unknown>world</unknown>!"
          components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello world!')
  })

  it('renders self-closing tags', () => {
    const Break: Component<{ children?: JSX.Element }> = () => (
      <br />
    )

    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Line one<br/>Line two"
          components={{ ...richComponents, br: Break }}
        />
      </I18nProvider>
    ))

    expect(container.querySelector('br')).toBeDefined()
  })

  it('uses __message and __components (build plugin API)', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          __message="Hello <bold>build</bold>!"
          __components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello build!')
    expect(container.querySelector('strong')?.textContent).toBe('build')
  })

  it('prefers __message over message prop', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans
          message="Hello <bold>message</bold>!"
          __message="Hello <bold>override</bold>!"
          components={richComponents}
          __components={richComponents}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello override!')
    expect(container.querySelector('strong')?.textContent).toBe('override')
  })

  it('translates children-only rich content without the build plugin', () => {
    const { container } = render(() => (
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            [hashMessage('Click <0>here</0> to continue')]: '<0>こちら</0>を押して続行',
          },
        }}
      >
        <Trans>
          Click <a href="/next">here</a> to continue
        </Trans>
      </I18nProvider>
    ))

    expect(container.textContent).toBe('こちらを押して続行')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/next')
    expect(container.querySelector('a')?.textContent).toBe('こちら')
  })
})
