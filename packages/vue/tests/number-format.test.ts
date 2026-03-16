import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { NumberFormat } from '../src/components/NumberFormat'

describe('NumberFormat', () => {
  function mountWithPlugin(
    component: ReturnType<typeof defineComponent>,
    options: Parameters<typeof createFluentVue>[0] = { locale: 'en', messages: { en: {} } },
  ) {
    const plugin = createFluentVue(options)
    return mount(component, { global: { plugins: [plugin] } })
  }

  it('formats an integer with grouping separators', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 1234567 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en').format(1234567)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats a decimal number', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 1234.56 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en').format(1234.56)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats zero', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 0 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    expect(wrapper.text()).toBe('0')
  })

  it('formats negative numbers', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: -42.5 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en').format(-42.5)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats very large numbers', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 9999999.99 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en').format(9999999.99)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "percent" style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 0.75, style: 'percent' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en', { style: 'percent' }).format(0.75)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "decimal" style (fixed fraction digits)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 3.1, style: 'decimal' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(3.1)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "currency" style (en locale = USD)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 99.99, style: 'currency' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'USD',
    }).format(99.99)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with currency style using locale-appropriate currency (de = EUR)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 49.99, style: 'currency' })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'de',
      messages: { de: {} },
    })
    const expected = new Intl.NumberFormat('de', {
      style: 'currency',
      currency: 'EUR',
    }).format(49.99)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with currency style using locale-appropriate currency (ja = JPY)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 1500, style: 'currency' })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'ja',
      messages: { ja: {} },
    })
    const expected = new Intl.NumberFormat('ja', {
      style: 'currency',
      currency: 'JPY',
    }).format(1500)
    expect(wrapper.text()).toBe(expected)
  })

  it('uses custom numberFormats from the plugin', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 1500, style: 'compact' })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'en',
      messages: { en: {} },
      numberFormats: { compact: { notation: 'compact' as const } },
    })
    const expected = new Intl.NumberFormat('en', { notation: 'compact' }).format(1500)
    expect(wrapper.text()).toBe(expected)
  })

  it('respects a different locale for default formatting (de)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 1234.56 })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'de',
      messages: { de: {} },
    })
    const expected = new Intl.NumberFormat('de').format(1234.56)
    expect(wrapper.text()).toBe(expected)
  })

  it('falls back to default when given an unknown style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 42, style: 'nonexistent' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.NumberFormat('en').format(42)
    expect(wrapper.text()).toBe(expected)
  })

  it('throws when used outside of plugin', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 42 })
      },
    })
    expect(() => mount(Comp)).toThrow('useI18n() requires createFluentVue plugin')
  })

  it('renders with custom tag', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 42, tag: 'strong' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    expect(wrapper.find('strong').exists()).toBe(true)
  })

  it('renders with default span tag', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(NumberFormat, { value: 42 })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    expect(wrapper.find('span').exists()).toBe(true)
  })

  describe('edge cases', () => {
    it('formats NaN', () => {
      const Comp = defineComponent({
        setup() {
          return () => h(NumberFormat, { value: NaN })
        },
      })
      const wrapper = mountWithPlugin(Comp)
      expect(wrapper.text()).toBe('NaN')
    })

    it('formats Infinity', () => {
      const Comp = defineComponent({
        setup() {
          return () => h(NumberFormat, { value: Infinity })
        },
      })
      const wrapper = mountWithPlugin(Comp)
      expect(wrapper.text()).toContain('∞')
    })

    it('formats -Infinity', () => {
      const Comp = defineComponent({
        setup() {
          return () => h(NumberFormat, { value: -Infinity })
        },
      })
      const wrapper = mountWithPlugin(Comp)
      const expected = new Intl.NumberFormat('en').format(-Infinity)
      expect(wrapper.text()).toBe(expected)
    })

    it('re-renders on locale switch', async () => {
      const plugin = createFluentVue({
        locale: 'en',
        messages: { en: {}, de: {} },
      })

      const Comp = defineComponent({
        setup() {
          return () => h(NumberFormat, { value: 1234.56 })
        },
      })

      const wrapper = mount(Comp, { global: { plugins: [plugin] } })
      const enText = wrapper.text()

      plugin.global.setLocale('de')
      await nextTick()

      const deText = wrapper.text()
      const expectedDe = new Intl.NumberFormat('de').format(1234.56)
      expect(deText).toBe(expectedDe)
      // en uses ',' for thousands, de uses '.' - they should differ
      expect(enText).not.toBe(deText)
    })
  })
})
