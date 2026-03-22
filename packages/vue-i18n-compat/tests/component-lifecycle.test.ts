import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, inject, nextTick } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge, BRIDGE_KEY } from '../src/bridge'
import { useI18n } from '../src/composable'
import type { BridgeContext } from '../src/types'
import { createMockVueI18n, mountApp } from './_helpers'

describe('component lifecycle — bridge context in components', () => {
  it('multiple components calling useI18n() independently get same context', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { world: 'World' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let ctx1: BridgeContext | undefined
    let ctx2: BridgeContext | undefined

    const Child1 = defineComponent({
      setup() { ctx1 = useI18n() },
      render() { return h('span') },
    })
    const Child2 = defineComponent({
      setup() { ctx2 = useI18n() },
      render() { return h('span') },
    })
    const Parent = defineComponent({
      render() { return h('div', [h(Child1), h(Child2)]) },
    })

    const el = document.createElement('div')
    const app = createApp(Parent)
    app.use(bridge)
    app.mount(el)

    expect(ctx1).toBeDefined()
    expect(ctx2).toBeDefined()
    expect(ctx1).toBe(ctx2)
    app.unmount()
  })

  it('nested components (parent/child) share bridge context', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { msg: 'Hello' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let parentCtx: BridgeContext | undefined
    let childCtx: BridgeContext | undefined

    const Child = defineComponent({
      setup() { childCtx = useI18n() },
      render() { return h('span') },
    })
    const Parent = defineComponent({
      setup() { parentCtx = useI18n() },
      render() { return h('div', [h(Child)]) },
    })

    const el = document.createElement('div')
    const app = createApp(Parent)
    app.use(bridge)
    app.mount(el)

    expect(parentCtx).toBe(childCtx)
    app.unmount()
  })

  it('component renders translated text via useI18n().t()', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { greeting: 'Hello World' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let translated = ''

    const { app } = mountApp(() => {
      const { t } = useI18n()
      translated = t('greeting')
    }, [bridge])

    expect(translated).toBe('Hello World')
    app.unmount()
  })

  it('component reactively updates when locale changes', async () => {
    const vueI18n = createMockVueI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, ja: { hello: 'こんにちは' } },
    })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { hello: 'Hello' }, ja: { hello: 'こんにちは' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let ctx: BridgeContext | undefined
    const { app } = mountApp(() => {
      ctx = useI18n()
    }, [bridge])

    expect(ctx!.locale.value).toBe('en')

    await ctx!.setLocale('ja')
    await nextTick()

    expect(ctx!.locale.value).toBe('ja')
    app.unmount()
  })

  it('template uses $t global property correctly', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { title: 'Page Title' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    const $t = app.config.globalProperties['$t']
    expect($t('title')).toBe('Page Title')
    app.unmount()
  })

  it('component with defineComponent and render function using bridge context', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { label: 'Click me' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let rendered = ''

    const Comp = defineComponent({
      setup() {
        const ctx = inject(BRIDGE_KEY)!
        rendered = ctx.t('label')
      },
      render() { return h('button', rendered) },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.use(bridge)
    app.mount(el)

    expect(rendered).toBe('Click me')
    app.unmount()
  })
})
