import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createFluentVue } from '@fluenti/vue'
import { createFluentBridge, BRIDGE_KEY } from '../src/bridge'
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
    tc(key: string, count: number, values?: any) {
      const msg = messages[localeRef.value]?.[key]
      if (msg === undefined) return key
      // Simple pipe-separated plural: singular | plural
      const parts = msg.split(' | ')
      return (count === 1 ? parts[0] : parts[1] ?? parts[0])
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

function mountApp(setup: () => any, plugins: any[]) {
  const Comp = defineComponent({ setup, render() { return h('div') } })
  const el = document.createElement('div')
  const app = createApp(Comp)
  for (const p of plugins) app.use(p)
  app.mount(el)
  return { app, el }
}

describe('createFluentBridge', () => {
  it('returns a plugin with install and global', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge).toHaveProperty('install')
    expect(bridge).toHaveProperty('global')
  })

  it('installs both vue-i18n and fluenti plugins', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])
    // Both should have registered global properties
    expect(app.config.globalProperties['$t']).toBeDefined()
    expect(app.config.globalProperties['$d']).toBeDefined()
    app.unmount()
  })
})

describe('bridged t() — fluenti-first', () => {
  it('returns fluenti translation when key exists in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hello from vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hello from fluenti' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    expect(bridge.global.t('hello')).toBe('Hello from fluenti')
  })

  it('falls back to vue-i18n when key not in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacy: 'Legacy message' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    expect(bridge.global.t('legacy')).toBe('Legacy message')
  })

  it('passes values to fluenti interpolation', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { greeting: 'Hello {name}!' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.t('greeting', { name: 'World' })).toBe('Hello World!')
  })

  it('passes values to vue-i18n fallback interpolation', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { greeting: 'Hi {name}!' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.t('greeting', { name: 'Alice' })).toBe('Hi Alice!')
  })
})

describe('bridged t() — vue-i18n-first', () => {
  it('prefers vue-i18n when key exists in both', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hello from vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hello from fluenti' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    expect(bridge.global.t('hello')).toBe('Hello from vue-i18n')
  })

  it('falls back to fluenti when key not in vue-i18n', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { newKey: 'New fluenti key' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    expect(bridge.global.t('newKey')).toBe('New fluenti key')
  })
})

describe('bridged tc()', () => {
  it('uses fluenti ICU plurals when key exists in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { items: '{count, plural, one {# item} other {# items}}' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('items', 1)).toBe('1 item')
    expect(bridge.global.tc('items', 5)).toBe('5 items')
  })

  it('falls back to vue-i18n tc for legacy pipe plurals', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { apples: '{count} apple | {count} apples' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('apples', 1)).toBe('1 apple')
    expect(bridge.global.tc('apples', 5)).toBe('5 apples')
  })
})

describe('bridged te()', () => {
  it('returns true if key exists in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hello' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.te('hello')).toBe(true)
  })

  it('returns true if key exists in vue-i18n only', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacy: 'Legacy' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.te('legacy')).toBe(true)
  })

  it('returns false if key exists in neither', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.te('missing')).toBe(false)
  })
})

describe('locale sync', () => {
  it('syncs fluenti locale change to vue-i18n', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, ja: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, ja: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await bridge.global.setLocale('ja')
    await nextTick()

    expect(fluenti.global.locale.value).toBe('ja')
    expect(vueI18n.global.locale.value).toBe('ja')
    app.unmount()
  })

  it('syncs vue-i18n locale change to fluenti', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, fr: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, fr: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Directly change vue-i18n locale
    vueI18n.global.locale.value = 'fr'
    await nextTick()

    expect(fluenti.global.locale.value).toBe('fr')
    app.unmount()
  })

  it('does not enter infinite loop when both change simultaneously', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, de: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, de: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // This should not cause infinite recursion
    await bridge.global.setLocale('de')
    await nextTick()
    await nextTick()

    expect(fluenti.global.locale.value).toBe('de')
    expect(vueI18n.global.locale.value).toBe('de')
    app.unmount()
  })
})

describe('availableLocales', () => {
  it('merges locales from both libraries', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {}, fr: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, ja: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.availableLocales.value).toEqual(['en', 'fr', 'ja'])
  })
})

describe('useI18n composable', () => {
  it('provides bridge context via injection', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { world: 'World' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let ctx: BridgeContext | undefined
    const { app } = mountApp(() => {
      const { inject } = require('vue')
      ctx = inject(BRIDGE_KEY)
    }, [bridge])

    expect(ctx).toBeDefined()
    expect(ctx!.t('hello')).toBe('Hi')
    expect(ctx!.t('world')).toBe('World')
    app.unmount()
  })
})

describe('tm()', () => {
  it('returns fluenti raw message when priority is fluenti-first', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi from vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hi from fluenti' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    expect(bridge.global.tm('hello')).toBe('Hi from fluenti')
  })

  it('falls back to vue-i18n tm when key not in fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacy: 'Legacy' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    expect(bridge.global.tm('legacy')).toBe('Legacy')
  })
})
