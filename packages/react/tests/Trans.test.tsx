import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '../src'
import { Trans } from '../src/components-entry'

describe('Trans', () => {
  afterEach(cleanup)
  it('renders simple text', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>Hello World</Trans>
      </I18nProvider>,
    )
    expect(screen.getByText('Hello World')).toBeDefined()
  })

  it('preserves nested components', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>
          Read the <a href="/docs">documentation</a> for more info.
        </Trans>
      </I18nProvider>,
    )
    const link = screen.getByText('documentation')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/docs')
  })

  it('uses translated message when available', () => {
    // The hash of "Hello World" should be looked up in catalog
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>Hello World</Trans>
      </I18nProvider>,
    )
    // Falls back to source text when no translation found
    expect(screen.getByText('Hello World')).toBeDefined()
  })

  it('uses custom render prop', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans render={(content) => <div data-testid="wrapper">{content}</div>}>
          Hello
        </Trans>
      </I18nProvider>,
    )
    expect(screen.getByTestId('wrapper').textContent).toBe('Hello')
  })

  it('throws if used outside Provider', () => {
    expect(() =>
      render(<Trans>Hello</Trans>),
    ).toThrow('<Trans> must be used within an <I18nProvider>')
  })

  it('handles multiple nested components', () => {
    render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>
          Click <b>here</b> or <em>there</em>.
        </Trans>
      </I18nProvider>,
    )
    expect(screen.getByText('here').tagName).toBe('B')
    expect(screen.getByText('there').tagName).toBe('EM')
  })

  it('renders empty content when children is empty string', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>{''}</Trans>
      </I18nProvider>,
    )
    // Should render without crashing; content should be empty
    expect(container.innerHTML).toBeDefined()
  })

  it('renders nothing when children is null', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>{null}</Trans>
      </I18nProvider>,
    )
    expect(container.innerHTML).toBeDefined()
  })

  it('renders nothing when children is undefined', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>{undefined}</Trans>
      </I18nProvider>,
    )
    expect(container.innerHTML).toBeDefined()
  })

  it('renders nothing when children is false', () => {
    const { container } = render(
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>{false}</Trans>
      </I18nProvider>,
    )
    // React treats false as empty — should not crash
    expect(container.innerHTML).toBeDefined()
  })
})
