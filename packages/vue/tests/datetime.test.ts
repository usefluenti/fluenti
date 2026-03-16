import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createFluentVue } from '../src/plugin'
import { DateTime } from '../src/components/DateTime'

describe('DateTime', () => {
  const fixedDate = new Date('2024-06-15T12:30:00Z')
  const fixedTimestamp = fixedDate.getTime()

  function mountWithPlugin(
    component: ReturnType<typeof defineComponent>,
    options: Parameters<typeof createFluentVue>[0] = { locale: 'en', messages: { en: {} } },
  ) {
    const plugin = createFluentVue(options)
    return mount(component, { global: { plugins: [plugin] } })
  }

  it('formats a Date object with default style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats a numeric timestamp with default style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedTimestamp })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en').format(fixedTimestamp)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "short" style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'short' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "long" style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'long' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "time" style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'time' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('formats with the built-in "datetime" style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'datetime' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('uses custom dateFormats from the plugin', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'custom' })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'en',
      messages: { en: {} },
      dateFormats: { custom: { year: '2-digit', month: '2-digit' } },
    })
    const expected = new Intl.DateTimeFormat('en', {
      year: '2-digit',
      month: '2-digit',
    }).format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('respects a different locale (de)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'de',
      messages: { de: {} },
    })
    const expected = new Intl.DateTimeFormat('de').format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('respects a different locale (ja)', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate })
      },
    })
    const wrapper = mountWithPlugin(Comp, {
      locale: 'ja',
      messages: { ja: {} },
    })
    const expected = new Intl.DateTimeFormat('ja').format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('falls back to default when given an unknown style', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, style: 'nonexistent' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    const expected = new Intl.DateTimeFormat('en').format(fixedDate)
    expect(wrapper.text()).toBe(expected)
  })

  it('throws when used outside of plugin', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate })
      },
    })
    expect(() => mount(Comp)).toThrow('useI18n() requires createFluentVue plugin')
  })

  it('renders with custom tag', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate, tag: 'time' })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    expect(wrapper.find('time').exists()).toBe(true)
  })

  it('renders with default span tag', () => {
    const Comp = defineComponent({
      setup() {
        return () => h(DateTime, { value: fixedDate })
      },
    })
    const wrapper = mountWithPlugin(Comp)
    expect(wrapper.find('span').exists()).toBe(true)
  })
})
