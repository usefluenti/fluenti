import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createFluenti } from '../src/plugin'
import { useI18n } from '../src/use-i18n'
import { mount } from '@vue/test-utils'

describe('useI18n', () => {
  it('throws when plugin is not installed', () => {
    const Comp = defineComponent({
      setup() {
        useI18n()
      },
      render() {
        return h('div')
      },
    })

    expect(() => mount(Comp)).toThrow('[fluenti] useI18n() requires createFluenti plugin')
  })

  it('returns the context when plugin is installed', () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    const Comp = defineComponent({
      setup() {
        const ctx = useI18n()
        return { msg: ctx.t('hello') }
      },
      render() {
        return h('div', this.msg)
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Hello')
  })

  it('re-renders when locale changes', async () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      },
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('hello'))
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Hello')

    plugin.global.setLocale('fr')
    await nextTick()

    expect(wrapper.text()).toBe('Bonjour')
  })

  it('re-renders with fallback locale', async () => {
    const plugin = createFluenti({
      locale: 'en',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello', farewell: 'Goodbye' },
        fr: { hello: 'Bonjour' },
      },
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('farewell'))
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Goodbye')

    plugin.global.setLocale('fr')
    await nextTick()

    // fr doesn't have farewell, falls back to en
    expect(wrapper.text()).toBe('Goodbye')
  })

  it('dynamically loads messages and re-renders', async () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: { en: {} },
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('greeting'))
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    // Initially returns the id
    expect(wrapper.text()).toBe('greeting')

    plugin.global.loadMessages('en', { greeting: 'Hi there' })
    // loadMessages updates the reactive catalogs, but t() depends on locale ref
    // We need to trigger reactivity by toggling locale or using nextTick
    plugin.global.setLocale('en') // re-trigger
    await nextTick()

    expect(wrapper.text()).toBe('Hi there')
  })

  it('exposes locale as a readonly ref', () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: { en: {} },
    })

    expect(plugin.global.locale.value).toBe('en')

    plugin.global.setLocale('fr')
    expect(plugin.global.locale.value).toBe('fr')
  })

  describe('edge cases', () => {
    it('returns all expected properties', () => {
      const plugin = createFluenti({
        locale: 'en',
        messages: { en: {} },
      })

      let ctx: ReturnType<typeof useI18n> | undefined
      const Comp = defineComponent({
        setup() {
          ctx = useI18n()
          return () => h('div')
        },
      })

      mount(Comp, { global: { plugins: [plugin] } })

      expect(ctx).toBeDefined()
      expect(typeof ctx!.t).toBe('function')
      expect(typeof ctx!.d).toBe('function')
      expect(typeof ctx!.n).toBe('function')
      expect(typeof ctx!.format).toBe('function')
      expect(typeof ctx!.setLocale).toBe('function')
      expect(typeof ctx!.loadMessages).toBe('function')
      expect(typeof ctx!.getLocales).toBe('function')
      expect(typeof ctx!.preloadLocale).toBe('function')
      expect(typeof ctx!.te).toBe('function')
      expect(typeof ctx!.tm).toBe('function')
      expect(ctx!.locale).toBeDefined()
      expect(ctx!.isLoading).toBeDefined()
      expect(ctx!.loadedLocales).toBeDefined()
    })

    it('concurrent setLocale calls — last one wins', async () => {
      const plugin = createFluenti({
        locale: 'en',
        messages: {
          en: { hello: 'Hello' },
          ja: { hello: 'こんにちは' },
          'zh-CN': { hello: '你好' },
        },
      })

      const Comp = defineComponent({
        setup() {
          const { t } = useI18n()
          return () => h('div', t('hello'))
        },
      })

      const wrapper = mount(Comp, {
        global: { plugins: [plugin] },
      })

      expect(wrapper.text()).toBe('Hello')

      plugin.global.setLocale('ja')
      plugin.global.setLocale('zh-CN')
      await nextTick()

      expect(wrapper.text()).toBe('你好')
    })

    it('context is same as plugin.global instance', () => {
      const plugin = createFluenti({
        locale: 'en',
        messages: { en: { hello: 'Hello' } },
      })

      let ctx: ReturnType<typeof useI18n> | undefined
      const Comp = defineComponent({
        setup() {
          ctx = useI18n()
          return () => h('div')
        },
      })

      mount(Comp, { global: { plugins: [plugin] } })

      // The useI18n() result should be the same object as plugin.global
      expect(ctx).toBe(plugin.global)
    })
  })
})

// ============================================================
// #3 loadMessages dual sync verification
// ============================================================
describe('loadMessages dual sync', () => {
  it('after loadMessages, getLocales includes the new locale (core sync)', () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    plugin.global.loadMessages('de', { hallo: 'Hallo' })
    expect(plugin.global.getLocales()).toContain('de')
  })

  it('after loadMessages, te returns true for loaded keys (local sync)', () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
    })

    plugin.global.loadMessages('de', { hallo: 'Hallo' })
    expect(plugin.global.te('hallo', 'de')).toBe(true)
    expect(plugin.global.te('nonexistent', 'de')).toBe(false)
  })
})

// ============================================================
// #4 setLocale with core sync
// ============================================================
describe('setLocale with core sync', () => {
  it('non-lazy setLocale updates locale correctly in t() output', () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
      },
    })

    expect(plugin.global.t('hello')).toBe('Hello')

    plugin.global.setLocale('fr')
    expect(plugin.global.t('hello')).toBe('Bonjour')
    expect(plugin.global.locale.value).toBe('fr')
  })

  it('setLocale during render produces correct output', async () => {
    const plugin = createFluenti({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        ja: { hello: 'こんにちは' },
      },
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('hello'))
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    expect(wrapper.text()).toBe('Hello')

    plugin.global.setLocale('ja')
    await nextTick()

    expect(wrapper.text()).toBe('こんにちは')
  })

  it('stale request handling — rapid switches show only final locale translations', async () => {
    let resolvers: Array<(v: Record<string, string>) => void> = []

    const loader = vi.fn().mockImplementation(() => {
      return new Promise<Record<string, string>>((resolve) => {
        resolvers.push(resolve)
      })
    })

    const plugin = createFluenti({
      locale: 'en',
      messages: { en: { hello: 'Hello' } },
      lazyLocaleLoading: true,
      chunkLoader: loader,
    })

    const Comp = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('div', t('hello'))
      },
    })

    const wrapper = mount(Comp, {
      global: { plugins: [plugin] },
    })

    // Rapid-fire locale switches
    const p1 = plugin.global.setLocale('ja')
    const p2 = plugin.global.setLocale('fr')

    // Resolve 'ja' first (stale request)
    resolvers[0]!({ hello: 'こんにちは' })
    await Promise.resolve()

    // Resolve 'fr' (current request)
    resolvers[1]!({ hello: 'Bonjour' })
    await p1
    await p2
    await nextTick()

    // Only the final locale ('fr') should be active
    expect(plugin.global.locale.value).toBe('fr')
    expect(wrapper.text()).toBe('Bonjour')
  })
})
