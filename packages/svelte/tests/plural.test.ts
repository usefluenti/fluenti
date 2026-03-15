import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/svelte'
import PluralTest from './fixtures/PluralTest.svelte'

describe('Plural component', () => {
  it('selects "other" by default', () => {
    const { container } = render(PluralTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 5,
        other: '# items',
      },
    })

    expect(container.textContent).toContain('5 items')
  })

  it('selects "one" for singular values', () => {
    const { container } = render(PluralTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 1,
        one: '# item',
        other: '# items',
      },
    })

    expect(container.textContent).toContain('1 item')
  })

  it('selects "zero" when provided and value is 0', () => {
    const { container } = render(PluralTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 0,
        zero: 'no items',
        one: '# item',
        other: '# items',
      },
    })

    expect(container.textContent).toContain('no items')
  })

  it('replaces # with value in selected message', () => {
    const { container } = render(PluralTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 42,
        other: 'There are # things',
      },
    })

    expect(container.textContent).toContain('There are 42 things')
  })

  it('uses catalog translation when available', () => {
    const icuKey = '{count, plural, one {# item} other {# items}}'
    const { container } = render(PluralTest, {
      props: {
        locale: 'ja',
        messages: {
          ja: {
            [icuKey]: (values?: Record<string, unknown>) => {
              const count = Number(values?.['count'] ?? 0)
              return `${count}個のアイテム`
            },
          },
        },
        value: 3,
        one: '# item',
        other: '# items',
      },
    })

    expect(container.textContent).toContain('3個のアイテム')
  })

  it('builds correct ICU message with all categories', () => {
    const { container } = render(PluralTest, {
      props: {
        locale: 'en',
        messages: { en: {} },
        value: 0,
        zero: 'No items',
        one: '# item',
        two: '# items (pair)',
        few: '# items (few)',
        many: '# items (many)',
        other: '# items',
      },
    })

    expect(container.textContent).toContain('No items')
  })
})
