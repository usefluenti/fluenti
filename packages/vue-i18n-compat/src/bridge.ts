import { type App, type InjectionKey, computed, watch } from 'vue'
import type { BridgeOptions, BridgeContext, BridgePlugin } from './types'

/** Injection key for the bridge context */
export const BRIDGE_KEY: InjectionKey<BridgeContext> = Symbol('fluenti-bridge')

/**
 * Create a bridge plugin that connects vue-i18n and fluenti.
 *
 * Both libraries are installed, locale is synced bidirectionally,
 * and translation lookups fall through from one library to the other.
 *
 * @example
 * ```ts
 * const bridge = createFluentBridge({
 *   vueI18n: i18n,
 *   fluenti: fluent,
 *   priority: 'fluenti-first',
 * })
 * app.use(bridge)
 * ```
 */
export function createFluentBridge(options: BridgeOptions): BridgePlugin {
  const { vueI18n, fluenti, priority = 'fluenti-first' } = options
  const fluentCtx = fluenti.global
  const vueI18nGlobal = vueI18n.global

  // --- Locale sync (bidirectional, with guard to prevent loops) ---
  let syncing = false

  function syncLocale(source: 'fluenti' | 'vue-i18n', newLocale: string) {
    if (syncing) return
    syncing = true
    try {
      if (source === 'fluenti') {
        if (vueI18nGlobal.locale.value !== newLocale) {
          vueI18nGlobal.locale.value = newLocale
        }
      } else {
        if (fluentCtx.locale.value !== newLocale) {
          fluentCtx.setLocale(newLocale)
        }
      }
    } finally {
      syncing = false
    }
  }

  // --- Bridged translation functions ---

  function bridgedT(key: string | { id: string; message?: string }, values?: Record<string, unknown>): string {
    const stringKey = typeof key === 'string' ? key : key.id

    if (priority === 'fluenti-first') {
      if (fluentCtx.te(stringKey)) {
        return fluentCtx.t(key, values)
      }
      return vueI18nGlobal.t(stringKey, values ?? {})
    } else {
      if (vueI18nGlobal.te(stringKey)) {
        return vueI18nGlobal.t(stringKey, values ?? {})
      }
      return fluentCtx.t(key, values)
    }
  }

  function bridgedTc(key: string, count: number, values?: Record<string, unknown>): string {
    // If fluenti has the key, use ICU plural resolution via t()
    if (priority === 'fluenti-first' && fluentCtx.te(key)) {
      return fluentCtx.t(key, { count, ...values })
    }
    // Fall back to vue-i18n's tc (which handles pipe-separated plurals)
    if (vueI18nGlobal.tc) {
      return vueI18nGlobal.tc(key, count, values ?? {})
    }
    // vue-i18n v10+ removed tc, use t with count
    return vueI18nGlobal.t(key, { count, ...values } as any)
  }

  function bridgedTe(key: string, locale?: string): boolean {
    return fluentCtx.te(key, locale) || vueI18nGlobal.te(key, locale)
  }

  function bridgedTm(key: string): unknown {
    // Prefer fluenti raw message if available
    if (priority === 'fluenti-first') {
      const raw = fluentCtx.tm(key)
      if (raw !== undefined) return raw
    }
    return vueI18nGlobal.tm(key)
  }

  const availableLocales = computed(() => {
    const locales = new Set<string>([
      ...fluentCtx.getLocales(),
      ...vueI18nGlobal.availableLocales,
    ])
    return [...locales].sort()
  })

  const context: BridgeContext = {
    t: bridgedT,
    tc: bridgedTc,
    te: bridgedTe,
    tm: bridgedTm,
    d: fluentCtx.d,
    n: fluentCtx.n,
    format: fluentCtx.format,
    locale: fluentCtx.locale,
    setLocale: async (locale: string) => {
      await fluentCtx.setLocale(locale)
      // setLocale already triggers the watcher, but ensure sync for non-reactive paths
      syncLocale('fluenti', locale)
    },
    availableLocales,
    isLoading: fluentCtx.isLoading,
    fluenti: fluentCtx,
    vueI18n: vueI18nGlobal,
  }

  return {
    install(app: App) {
      // Install both plugins
      app.use(vueI18n)
      app.use(fluenti)

      // Set up locale watchers (must be done after install since refs may be set up during install)
      watch(fluentCtx.locale, (newLocale) => {
        syncLocale('fluenti', newLocale)
      })
      watch(vueI18nGlobal.locale, (newLocale) => {
        syncLocale('vue-i18n', newLocale)
      })

      // Override global properties with bridged versions
      app.config.globalProperties['$t'] = bridgedT
      app.config.globalProperties['$te'] = bridgedTe
      app.config.globalProperties['$tc'] = bridgedTc

      // Provide bridge context
      app.provide(BRIDGE_KEY, context)
    },
    global: context,
  }
}
