import { describe, it, expect } from 'vitest'
import { render } from '@solidjs/testing-library'
import { Trans, Plural, Select, DateTime, NumberFormat } from '../src/components-entry'
import { I18nProvider } from '../src'
import * as mainExports from '../src'

describe('components-entry subpath', () => {
  it('exports all components', () => {
    expect(typeof Trans).toBe('function')
    expect(typeof Plural).toBe('function')
    expect(typeof Select).toBe('function')
    expect(typeof DateTime).toBe('function')
    expect(typeof NumberFormat).toBe('function')
  })

  it('main entry does not export component values', () => {
    // Main entry only re-exports types for components, not the runtime values
    expect((mainExports as Record<string, unknown>).Trans).toBeUndefined()
    expect((mainExports as Record<string, unknown>).Plural).toBeUndefined()
    expect((mainExports as Record<string, unknown>).Select).toBeUndefined()
    expect((mainExports as Record<string, unknown>).DateTime).toBeUndefined()
    expect((mainExports as Record<string, unknown>).NumberFormat).toBeUndefined()
  })

  it('Trans renders via components-entry', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Trans>Hello World</Trans>
      </I18nProvider>
    ))

    expect(container.textContent).toBe('Hello World')
  })

  it('DateTime renders via components-entry', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <DateTime value={new Date(2025, 0, 15)} />
      </I18nProvider>
    ))

    expect(container.textContent).toContain('2025')
  })

  it('NumberFormat renders via components-entry', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <NumberFormat value={1234.5} />
      </I18nProvider>
    ))

    expect(container.textContent).toContain('1')
  })

  it('Plural renders via components-entry', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toContain('items')
  })

  it('Select renders via components-entry', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Select
          value="male"
          other="They"
          options={{ male: 'He', female: 'She' }}
        />
      </I18nProvider>
    ))

    expect(container.textContent).toContain('He')
  })
})
