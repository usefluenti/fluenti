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

  it('wraps output in default span tag', () => {
    const { container } = render(() => (
      <I18nProvider locale="en" messages={{ en: {} }}>
        <Plural value={5} other="# items" />
      </I18nProvider>
    ))

    const span = container.querySelector('span')
    expect(span).toBeDefined()
    expect(span?.textContent).toBe('5 items')
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
})
