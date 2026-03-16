import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, ref } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge } from '../src/bridge'
import { useI18n } from '../src/composable'
import type { VueI18nInstance, VueI18nGlobal, BridgeContext } from '../src/types'

/** Create a minimal mock vue-i18n instance for testing */
function createMockVueI18n(opts: {
  locale?: string
  messages?: Record<string, Record<string, string>>
}): VueI18nInstance {
  const localeRef = ref(opts.locale ?? 'en')
  const messages = opts.messages ?? {}

  const global: VueI18nGlobal = {
    locale: localeRef,
    t(key: string, values?: any) {
      const msg = messages[localeRef.value]?.[key]
      if (msg === undefined) return key
      if (!values || typeof values !== 'object') return msg
      return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`))
    },
    te(key: string, locale?: string) {
      const loc = locale ?? localeRef.value
      return messages[loc]?.[key] !== undefined
    },
    tm(key: string) {
      return messages[localeRef.value]?.[key]
    },
    d(value: Date | number) {
      return new Date(value).toLocaleDateString(localeRef.value)
    },
    n(value: number) {
      return value.toLocaleString(localeRef.value)
    },
    get availableLocales() {
      return Object.keys(messages)
    },
  }

  return {
    install(app: any) {
      app.config.globalProperties['$t'] = global.t
    },
    global,
  }
}

function mountApp(setup: () => any, plugins: any[]) {
  const Comp = defineComponent({ setup, render() { return h('div') } })
  const el = document.createElement('div')
  const app = createApp(Comp)
  for (const p of plugins) app.use(p)
  app.mount(el)
  return { app, el }
}

describe('useBridge composable', () => {
  it('returns bridge context when bridge plugin is installed', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { world: 'World' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let ctx: BridgeContext | undefined
    const { app } = mountApp(() => {
      ctx = useI18n()
    }, [bridge])

    expect(ctx).toBeDefined()
    expect(ctx!.t('hello')).toBe('Hi')
    expect(ctx!.t('world')).toBe('World')
    expect(ctx!.locale.value).toBe('en')
    app.unmount()
  })

  it('throws when bridge plugin is not installed', () => {
    let error: Error | undefined

    // Mount without the bridge plugin — useI18n should throw
    const Comp = defineComponent({
      setup() {
        try {
          useI18n()
        } catch (e) {
          error = e as Error
        }
      },
      render() { return h('div') },
    })

    const el = document.createElement('div')
    const app = createApp(Comp)
    app.mount(el)

    expect(error).toBeDefined()
    expect(error!.message).toContain('[@fluenti/vue-i18n-compat]')
    expect(error!.message).toContain('bridge plugin')
    app.unmount()
  })
})
