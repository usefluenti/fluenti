import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { I18nProvider } from '../provider'
import { Plural } from '../components/Plural'

function withProvider(ui: React.ReactNode, locale = 'en') {
  return createElement(I18nProvider, { locale, messages: { [locale]: {} }, children: null }, ui)
}

describe('Plural edge cases', () => {
  // 1. No provider throws
  it('throws when used outside I18nProvider', () => {
    expect(() => {
      render(createElement(Plural, { value: 1, other: 'items' }))
    }).toThrow('[fluenti] <Plural> must be used within an <I18nProvider>')
  })

  // 2. offset
  it('applies offset before selecting plural category', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: 2,
          offset: 1,
          // After offset: 2 - 1 = 1, which selects "one" in English
          one: '# person remaining',
          other: '# people remaining',
        }),
      ),
    )
    // value is 2, category is based on offset value (1) -> "one", and # uses the adjusted count
    expect(container.textContent).toBe('1 person remaining')
  })

  // 3. ReactNode (JSX) in category props
  it('renders JSX in category props', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: 1,
          one: createElement('strong', null, 'one item'),
          other: 'many items',
        }),
      ),
    )
    const strong = container.querySelector('strong')
    expect(strong).toBeTruthy()
    expect(strong?.textContent).toBe('one item')
  })

  // 4. # replacement (string props)
  it('replaces # with formatted value in string props', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: 5,
          one: '# item',
          other: '# items',
        }),
      ),
    )
    expect(container.textContent).toBe('5 items')
  })

  // 5. # replacement (ReactNode props now route through synthetic ICU too)
  it('replaces # in ReactNode props via the runtime synthetic ICU path', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: 5,
          one: createElement('span', null, '# item'),
          other: createElement('span', null, '# items'),
        }),
      ),
    )
    expect(container.textContent).toBe('5 items')
  })

  // 6. NaN value
  it('handles NaN value gracefully', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: NaN,
          one: '# item',
          other: '# items',
        }),
      ),
    )
    // NaN should fall through to "other" and be formatted
    expect(container.textContent).toBe('NaN items')
  })

  // 7. Negative value
  it('handles negative values', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: -3,
          one: '# degree',
          other: '# degrees',
        }),
      ),
    )
    expect(container.textContent).toContain('-3')
    expect(container.textContent).toContain('degrees')
  })

  // 8. Arabic categories (two, few, many)
  it('selects "two" category for Arabic locale', () => {
    const { container } = render(
      withProvider(
        createElement(Plural, {
          value: 2,
          one: 'واحد',
          two: 'اثنان',
          few: 'قليل',
          many: 'كثير',
          other: 'أخرى',
        }),
        'ar',
      ),
    )
    // Arabic CLDR: value=2 -> "two"
    expect(container.textContent).toBe('اثنان')
  })
})
