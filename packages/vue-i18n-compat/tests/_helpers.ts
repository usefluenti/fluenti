import { createApp, defineComponent, h, ref } from 'vue'
import type { VueI18nInstance, VueI18nGlobal } from '../src/types'

/** Create a minimal mock vue-i18n instance for testing */
export function createMockVueI18n(opts: {
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
    tc(key: string, count: number, _values?: any) {
      const msg = messages[localeRef.value]?.[key]
      if (msg === undefined) return key
      const parts = msg.split(' | ')
      return (count === 1 ? parts[0]! : (parts[1] ?? parts[0]!))
        .replace(/\{count\}/g, String(count))
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
      app.config.globalProperties['$tc'] = global.tc
      app.config.globalProperties['$te'] = global.te
    },
    global,
  }
}

/** Create a mock vue-i18n instance without tc (simulating vue-i18n v10+) */
export function createMockVueI18nNoTc(opts: {
  locale?: string
  messages?: Record<string, Record<string, string>>
}): VueI18nInstance {
  const instance = createMockVueI18n(opts)
  const global = { ...instance.global }
  delete global.tc
  return { ...instance, global }
}

/** Mount a Vue app with given setup function and plugins */
export function mountApp(setup: () => any, plugins: any[]) {
  const Comp = defineComponent({ setup, render() { return h('div') } })
  const el = document.createElement('div')
  const app = createApp(Comp)
  for (const p of plugins) app.use(p)
  app.mount(el)
  return { app, el }
}
