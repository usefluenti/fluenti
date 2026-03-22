import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { I18nProvider, Select } from '../src'

describe('Select component', () => {
  describe('options prop API (type-safe)', () => {
    it('selects matching option from options prop', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="male"
            options={{ male: 'He liked it', female: 'She liked it' }}
            other="They liked it"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('He liked it')
    })

    it('falls back to "other" when no match in options', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="nonbinary"
            options={{ male: 'He liked it', female: 'She liked it' }}
            other="They liked it"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('They liked it')
    })

    it('works with empty options object', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select value="male" options={{}} other="Fallback" />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('Fallback')
    })

    it('uses catalog translation for string options', () => {
      const { container } = render(() => (
        <I18nProvider
          locale="ja"
          messages={{
            ja: {
              '{value, select, male {He liked it} female {She liked it} other {They liked it}}':
                '{value, select, male {彼が気に入りました} female {彼女が気に入りました} other {その人が気に入りました}}',
            },
          }}
        >
          <Select
            value="male"
            options={{ male: 'He liked it', female: 'She liked it' }}
            other="They liked it"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('彼が気に入りました')
    })
  })

  describe('attrs-based API (backwards compatible)', () => {
    it('selects matching option from dynamic attrs', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="male"
            male="He liked it"
            female="She liked it"
            other="They liked it"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('He liked it')
    })

    it('falls back to "other" from attrs when no match', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="nonbinary"
            male="He liked it"
            female="She liked it"
            other="They liked it"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('They liked it')
    })
  })

  describe('options prop takes precedence over attrs', () => {
    it('uses options prop value when both options and attrs are present', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="male"
            options={{ male: 'From options' }}
            male="From attrs"
            other="They"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('From options')
    })

    it('falls back to other (not attrs) when options prop is set but has no match', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="female"
            options={{ male: 'He' }}
            female="She from attrs"
            other="They"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('They')
    })
  })

  describe('tag prop', () => {
    it('renders without wrapper by default (Fragment)', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select value="x" other="text" />
        </I18nProvider>
      ))

      expect(container.querySelector('span')).toBeNull()
      expect(container.textContent).toBe('text')
    })

    it('uses custom tag prop', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select value="x" other="text" tag="div" />
        </I18nProvider>
      ))

      const div = container.querySelector('div')
      expect(div).not.toBeNull()
      expect(div!.textContent).toBe('text')
    })
  })

  describe('reactivity', () => {
    it('reacts to value signal changes', async () => {
      const [gender, setGender] = createSignal('male')

      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value={gender()}
            options={{ male: 'He', female: 'She' }}
            other="They"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('He')

      setGender('female')
      await Promise.resolve()

      expect(container.textContent).toBe('She')

      setGender('unknown')
      await Promise.resolve()

      expect(container.textContent).toBe('They')
    })
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('renders "other" when no case matches and no options defined', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="unknown_value"
            other="No match found"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('No match found')
    })

    it('handles empty string value', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value=""
            options={{ '': 'Empty match', other: 'Other' }}
            other="Fallback"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('Empty match')
    })

    it('reacts to signal-driven value and options changes', async () => {
      const [val, setVal] = createSignal('a')

      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value={val()}
            options={{ a: 'Option A', b: 'Option B' }}
            other="Default"
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('Option A')

      setVal('b')
      await Promise.resolve()
      expect(container.textContent).toBe('Option B')

      setVal('c')
      await Promise.resolve()
      expect(container.textContent).toBe('Default')
    })
  })

  describe('JSX element props (rich text)', () => {
    it('renders JSX element option from options prop', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="male"
            options={{
              male: <><strong>He</strong> liked this</>,
              female: <><strong>She</strong> liked this</>,
            }}
            other={<><em>They</em> liked this</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('He')
      expect(container.textContent).toContain('liked this')
    })

    it('falls back to JSX other when no option matches', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="nonbinary"
            options={{
              male: <><strong>He</strong></>,
            }}
            other={<><em>They</em> liked this</>}
          />
        </I18nProvider>
      ))

      expect(container.querySelector('em')?.textContent).toBe('They')
    })

    it('renders mixed string + JSX options', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select
            value="male"
            options={{
              male: <><strong>He</strong></>,
              female: 'She',
            }}
            other="They"
          />
        </I18nProvider>
      ))

      expect(container.querySelector('strong')?.textContent).toBe('He')
    })

    it('translates rich JSX options without the build plugin', () => {
      const { container } = render(() => (
        <I18nProvider
          locale="ja"
          messages={{
            ja: {
              '{value, select, male {<0>He</0> liked this} other {<1>They</1> liked this}}':
                '{value, select, male {<0>彼</0>が気に入りました} other {<1>その人</1>が気に入りました}}',
            },
          }}
        >
          <Select
            value="male"
            options={{
              male: [<strong>He</strong>, ' liked this'],
            }}
            other={[<em>They</em>, ' liked this']}
          />
        </I18nProvider>
      ))

      expect(container.textContent).toBe('彼が気に入りました')
      expect(container.querySelector('strong')?.textContent).toBe('彼')
    })
  })
})
