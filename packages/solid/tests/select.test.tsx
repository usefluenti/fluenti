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
    it('defaults to span wrapper', () => {
      const { container } = render(() => (
        <I18nProvider locale="en" messages={{ en: {} }}>
          <Select value="x" other="text" />
        </I18nProvider>
      ))

      const span = container.querySelector('span')
      expect(span).not.toBeNull()
      expect(span!.textContent).toBe('text')
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
  })
})
