import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { I18nProvider, Plural } from '../src'

describe('Plural component', () => {
  it('selects "other" by default', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('5 items')
  })

  it('selects "one" for singular values', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={1} one="# item" other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('1 item')
  })

  it('selects "zero" when provided and value is 0', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={0} zero="no items" one="# item" other="# items" />
      </I18nProvider>
    ))

    // With ICU =0 exact match, "zero" prop maps to =0 which triggers for value 0
    expect(container.textContent).toBe('no items')
  })

  it('replaces # with value in selected message', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={42} other="There are # things" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('There are 42 things')
  })

  it('replaces multiple # tokens', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={3} other="# out of # total" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('3 out of 3 total')
  })

  it('reacts to signal value changes', async () => {
    const [count, setCount] = createSignal(1)

    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={count()} one="# item" other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('1 item')

    setCount(5)
    await Promise.resolve()

    expect(container.textContent).toBe('5 items')
  })

  it('falls back to other when category prop is missing', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={1} other="# things" />
      </I18nProvider>
    ))

    // No "one" prop provided, so ICU message only has "other" → "# things"
    expect(container.textContent).toBe('1 things')
  })

  // ─── tag prop ───────────────────────────────────────────────────────

  it('renders without wrapper by default (Fragment)', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} other="# items" />
      </I18nProvider>
    ))

    // No span wrapper by default — content renders directly
    expect(container.querySelector('span')).toBeNull()
    expect(container.textContent).toBe('5 items')
  })

  it('wraps output in custom tag', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} other="# items" tag="p" />
      </I18nProvider>
    ))

    const p = container.querySelector('p')
    expect(p).toBeDefined()
    expect(p?.tagName.toLowerCase()).toBe('p')
    expect(p?.textContent).toBe('5 items')
  })

  // ─── Catalog-based translation lookup ───────────────────────────────

  it('uses catalog translation when available', () => {
    const icuKey = '{count, plural, one {# item} other {# items}}'
    const { container } = render(() => (
      <I18nProvider
        locale="ja"
        messages={{
          ja: {
            // Compiled catalog entry: a function that returns the translated string
            [icuKey]: (values?: Record<string, unknown>) => {
              const count = Number(values?.['count'] ?? 0)
              return `${count}個のアイテム`
            },
          },
        }}
      >
        <Plural value={3} one="# item" other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('3個のアイテム')
  })

  // ─── ICU message building ───────────────────────────────────────────

  it('builds correct ICU message with all categories', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural
          value={0}
          zero="No items"
          one="# item"
          two="# items (pair)"
          few="# items (few)"
          many="# items (many)"
          other="# items"
        />
      </I18nProvider>
    ))

    // With =0 exact match, value 0 selects the "zero" form
    expect(container.textContent).toBe('No items')
  })

  it('builds ICU message with only other category', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={7} other="# things" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('7 things')
  })

  // ─── JSX element props (rich text) ────────────────────────────────────

  describe('JSX element props (rich text)', () => {
    it('renders JSX element prop for matching category (zero)', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={0}
            zero={<>No <strong>items</strong> left</>}
            other={<>Some items</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('items')
      expect(container.textContent).toContain('No')
      expect(container.textContent).toContain('left')
    })

    it('renders JSX element prop for matching category (one)', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={1}
            one={<><em>1</em> item remaining</>}
            other={<>items remaining</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('em')?.textContent).toBe('1')
      expect(container.textContent).toContain('item remaining')
    })

    it('renders JSX element prop for other category', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={5}
            one={<><em>1</em> item</>}
            other={<><strong>many</strong> items</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('many')
    })

    it('falls back to other when category prop is missing', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={1}
            other={<><strong>fallback</strong></>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('fallback')
    })

    it('reacts to signal value changes with JSX props', async () => {
      const [count, setCount] = createSignal(0)

      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={count()}
            zero={<>No <strong>items</strong></>}
            one={<><em>1</em> item</>}
            other={<>Many items</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('items')

      setCount(1)
      await Promise.resolve()
      expect(container.querySelector('em')?.textContent).toBe('1')

      setCount(5)
      await Promise.resolve()
      expect(container.textContent).toContain('Many items')
    })

    it('mixed string + JSX triggers rich mode', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural
            value={0}
            zero={<><strong>None</strong></>}
            one="1 item"
            other="# items"
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('None')
    })

    it('all existing string-prop tests still pass', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Plural value={5} one="# item" other="# items" />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('5 items')
    })
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('handles negative values', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={-3} one="# item" other="# items" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('-3 items')
  })

  it('handles NaN value gracefully', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={NaN} one="# item" other="# items" />
      </I18nProvider>
    ))

    // NaN selects "other" via Intl.PluralRules and renders as NaN
    expect(container.textContent).toBe('NaN items')
  })

  it('handles Arabic locale with all 6 plural categories', () => {
    // Arabic has: zero (0), one (1), two (2), few (3-10), many (11-99), other (100+)
    const { container: c0 } = render(() => (
      <I18nProvider locale="ar" messages={{ ar: {} }}>
        <Plural value={0} zero="٠ عناصر" one="عنصر واحد" two="عنصران" few="# عناصر قليلة" many="# عنصراً" other="# عنصر" />
      </I18nProvider>
    ))
    expect(c0.textContent).toBe('٠ عناصر')

    const { container: c2 } = render(() => (
      <I18nProvider locale="ar" messages={{ ar: {} }}>
        <Plural value={2} zero="٠ عناصر" one="عنصر واحد" two="عنصران" few="# عناصر قليلة" many="# عنصراً" other="# عنصر" />
      </I18nProvider>
    ))
    expect(c2.textContent).toBe('عنصران')

    const { container: c5 } = render(() => (
      <I18nProvider locale="ar" messages={{ ar: {} }}>
        <Plural value={5} zero="٠ عناصر" one="عنصر واحد" two="عنصران" few="# عناصر قليلة" many="# عنصراً" other="# عنصر" />
      </I18nProvider>
    ))
    expect(c5.textContent).toBe('5 عناصر قليلة')

    const { container: c50 } = render(() => (
      <I18nProvider locale="ar" messages={{ ar: {} }}>
        <Plural value={50} zero="٠ عناصر" one="عنصر واحد" two="عنصران" few="# عناصر قليلة" many="# عنصراً" other="# عنصر" />
      </I18nProvider>
    ))
    expect(c50.textContent).toBe('50 عنصراً')
  })

  it('handles ordinal-like locale selection', () => {
    // English ordinal: 1st, 2nd, 3rd, 4th...
    // The Plural component uses cardinal by default (Intl.PluralRules)
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={1} one="1st place" other="# place" />
      </I18nProvider>
    ))

    expect(container.textContent).toBe('1st place')
  })
})
