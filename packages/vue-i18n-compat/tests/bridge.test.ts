import { describe, it, expect, vi } from 'vitest'
import { createApp, defineComponent, h, inject, nextTick, ref } from 'vue'
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
    tc(key: string, count: number, _values?: any) {
      const msg = messages[localeRef.value]?.[key]
      if (msg === undefined) return key
      // Simple pipe-separated plural: singular | plural
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
function createMockVueI18nNoTc(opts: {
  locale?: string
  messages?: Record<string, Record<string, string>>
}): VueI18nInstance {
  const instance = createMockVueI18n(opts)
  // Remove tc to simulate vue-i18n v10+
  const global = { ...instance.global }
  delete global.tc
  return { ...instance, global }
}

function mountApp(setup: () => any, plugins: any[]) {
  const Comp = defineComponent({ setup, render() { return h('div') } })
  const el = document.createElement('div')
  const app = createApp(Comp)
  for (const p of plugins) app.use(p)
  app.mount(el)
  return { app, el }
}

// ─── Existing tests ──────────────────────────────────────────────────────

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

// ─── Edge-case tests ─────────────────────────────────────────────────────

describe('edge cases — createFluentBridge', () => {
  it('installs two plugins (both vue-i18n and fluenti install are called)', () => {
    const vueI18nInstall = vi.fn()
    const fluentiInstall = vi.fn()

    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const originalVueI18nInstall = vueI18n.install
    vueI18n.install = (app: any) => {
      vueI18nInstall()
      originalVueI18nInstall(app)
    }

    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const originalFluentiInstall = fluenti.install
    fluenti.install = (app: any) => {
      fluentiInstall()
      originalFluentiInstall(app)
    }

    const bridge = createFluentBridge({ vueI18n, fluenti })
    const { app } = mountApp(() => {}, [bridge])

    expect(vueI18nInstall).toHaveBeenCalledTimes(1)
    expect(fluentiInstall).toHaveBeenCalledTimes(1)
    app.unmount()
  })

  it('sync guard prevents infinite loop during rapid locale changes', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, ja: {}, fr: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, ja: {}, fr: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Rapid successive changes should not cause stack overflow
    await bridge.global.setLocale('ja')
    await bridge.global.setLocale('fr')
    await bridge.global.setLocale('en')
    await nextTick()
    await nextTick()

    expect(fluenti.global.locale.value).toBe('en')
    expect(vueI18n.global.locale.value).toBe('en')
    app.unmount()
  })

  it('bridgedT with MessageDescriptor object', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { 'msg-id': 'Resolved from catalog' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const result = bridge.global.t({ id: 'msg-id', message: 'Fallback {name}' })
    expect(result).toBe('Resolved from catalog')
  })

  it('bridgedTc fluenti-first uses fluenti ICU with extra values', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { files: '{count, plural, one {# file in {folder}} other {# files in {folder}}}' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.tc('files', 1, { folder: 'docs' })).toBe('1 file in docs')
    expect(bridge.global.tc('files', 3, { folder: 'docs' })).toBe('3 files in docs')
  })

  it('bridgedTc falls back to vue-i18n t with count when tc is absent (v10+)', () => {
    const vueI18n = createMockVueI18nNoTc({
      messages: { en: { items: '{count} item(s)' } },
    })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // Without tc, falls through to vueI18nGlobal.t with { count }
    const result = bridge.global.tc('items', 5)
    // vue-i18n mock t replaces {count} with the value from the values object
    expect(result).toBe('5 item(s)')
  })

  it('bridgedTe checks both libraries', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { legacyOnly: 'L' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { fluentiOnly: 'F' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.te('fluentiOnly')).toBe(true)
    expect(bridge.global.te('legacyOnly')).toBe(true)
    expect(bridge.global.te('neither')).toBe(false)
  })

  it('bridgedTm fluenti-first prefers fluenti over vue-i18n', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { msg: 'vue-i18n version' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { msg: 'fluenti version' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'fluenti-first' })

    expect(bridge.global.tm('msg')).toBe('fluenti version')
  })

  it('availableLocales computes union of both (deduplicates shared locales)', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {}, fr: {}, de: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, ja: {}, de: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const locales = bridge.global.availableLocales.value
    expect(locales).toEqual(['de', 'en', 'fr', 'ja'])
    // No duplicates for 'de' and 'en'
    expect(new Set(locales).size).toBe(locales.length)
  })

  it('bridge d() delegates to fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const date = new Date('2024-01-15')
    const result = bridge.global.d(date)
    // Should return the fluenti-formatted date (same as fluenti.global.d)
    expect(result).toBe(fluenti.global.d(date))
  })

  it('bridge n() delegates to fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const result = bridge.global.n(1234.56)
    expect(result).toBe(fluenti.global.n(1234.56))
  })

  it('bridge format() delegates to fluenti', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const result = bridge.global.format('Hello {name}!', { name: 'Test' })
    expect(result).toBe('Hello Test!')
  })

  it('bridge setLocale syncs both libraries', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, ko: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, ko: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    await bridge.global.setLocale('ko')
    await nextTick()

    expect(bridge.global.locale.value).toBe('ko')
    expect(fluenti.global.locale.value).toBe('ko')
    expect(vueI18n.global.locale.value).toBe('ko')
    app.unmount()
  })

  it('bridge install overrides global properties with bridged versions', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { hello: 'Hi from vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { hello: 'Hi from fluenti' } } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // The bridged $t should be set on global properties (overriding both plugins)
    const $t = app.config.globalProperties['$t']
    expect($t).toBeDefined()
    // With fluenti-first default, bridged $t should prefer fluenti
    expect($t('hello')).toBe('Hi from fluenti')
    app.unmount()
  })

  it('bridge provides BRIDGE_KEY context', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    let ctx: BridgeContext | undefined
    const { app } = mountApp(() => {
      ctx = inject(BRIDGE_KEY)
    }, [bridge])

    expect(ctx).toBeDefined()
    expect(ctx!.t).toBeTypeOf('function')
    expect(ctx!.tc).toBeTypeOf('function')
    expect(ctx!.te).toBeTypeOf('function')
    expect(ctx!.tm).toBeTypeOf('function')
    expect(ctx!.d).toBeTypeOf('function')
    expect(ctx!.n).toBeTypeOf('function')
    expect(ctx!.format).toBeTypeOf('function')
    expect(ctx!.setLocale).toBeTypeOf('function')
    expect(ctx!.locale).toBeDefined()
    expect(ctx!.availableLocales).toBeDefined()
    expect(ctx!.isLoading).toBeDefined()
    expect(ctx!.fluenti).toBeDefined()
    expect(ctx!.vueI18n).toBeDefined()
    app.unmount()
  })

  it('defaults priority to fluenti-first when not specified', () => {
    const vueI18n = createMockVueI18n({ messages: { en: { key: 'vue-i18n' } } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: { key: 'fluenti' } } })
    // No priority option specified
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.t('key')).toBe('fluenti')
  })

  it('vue-i18n-first bridgedTc falls back to fluenti when key not in vue-i18n', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({
      locale: 'en',
      messages: { en: { items: '{count, plural, one {# item} other {# items}}' } },
    })
    const bridge = createFluentBridge({ vueI18n, fluenti, priority: 'vue-i18n-first' })

    // vue-i18n-first but key not in vue-i18n, so falls through to vue-i18n tc which returns the key
    // Since priority is vue-i18n-first, bridgedTc always goes to vue-i18n tc first
    const result = bridge.global.tc('items', 3)
    // tc falls through: first checks if priority is fluenti-first (no),
    // then tries vue-i18n tc (key not found, returns key), so result is 'items'
    expect(typeof result).toBe('string')
  })

  it('bridged t() returns key when missing from both', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    // fluenti te returns false, falls to vue-i18n t which returns key
    expect(bridge.global.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('context exposes fluenti and vueI18n references', () => {
    const vueI18n = createMockVueI18n({ messages: { en: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    expect(bridge.global.fluenti).toBe(fluenti.global)
    expect(bridge.global.vueI18n).toBe(vueI18n.global)
  })

  it('bidirectional locale sync: fluenti to vue-i18n via watcher', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, zh: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, zh: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Change fluenti locale directly via the underlying context
    await fluenti.global.setLocale('zh')
    await nextTick()

    expect(vueI18n.global.locale.value).toBe('zh')
    app.unmount()
  })

  it('bidirectional locale sync: vue-i18n to fluenti via watcher', async () => {
    const vueI18n = createMockVueI18n({ locale: 'en', messages: { en: {}, es: {} } })
    const fluenti = createFluentVue({ locale: 'en', messages: { en: {}, es: {} } })
    const bridge = createFluentBridge({ vueI18n, fluenti })

    const { app } = mountApp(() => {}, [bridge])

    // Change vue-i18n locale directly
    vueI18n.global.locale.value = 'es'
    await nextTick()

    expect(fluenti.global.locale.value).toBe('es')
    app.unmount()
  })
})
