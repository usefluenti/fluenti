import type { ComputedRef, Ref } from 'vue'
import type { FluentVuePlugin, FluentVueContext } from '@fluenti/vue'

/** Lookup priority when resolving translations across both libraries */
export type BridgePriority = 'fluenti-first' | 'vue-i18n-first'

/** Options for creating the bridge plugin */
export interface BridgeOptions {
  /** The vue-i18n instance (from createI18n()) */
  vueI18n: VueI18nInstance
  /** The fluenti Vue plugin (from createFluentVue()) */
  fluenti: FluentVuePlugin
  /** Which library to check first when resolving translations (default: 'fluenti-first') */
  priority?: BridgePriority
}

/**
 * Minimal vue-i18n instance interface.
 * We don't import vue-i18n types directly to avoid hard coupling.
 */
export interface VueI18nInstance {
  install: (app: any) => void
  global: VueI18nGlobal
}

/** Minimal vue-i18n global composer interface */
export interface VueI18nGlobal {
  locale: Ref<string>
  t: (key: string, ...args: any[]) => string
  te: (key: string, locale?: string) => boolean
  tm: (key: string) => unknown
  tc?: (key: string, count: number, ...args: any[]) => string
  d: (value: Date | number, ...args: any[]) => string
  n: (value: number, ...args: any[]) => string
  availableLocales: string[]
}

/** Context returned by the bridge's useI18n() composable */
export interface BridgeContext {
  /** Translate a message — checks both libraries per priority setting */
  t(key: string | { id: string; message?: string }, values?: Record<string, unknown>): string
  /** Pluralized translation (delegates to vue-i18n for unmigrated plural messages) */
  tc(key: string, count: number, values?: Record<string, unknown>): string
  /** Check if a translation key exists in either library */
  te(key: string, locale?: string): boolean
  /** Get raw message (from vue-i18n) */
  tm(key: string): unknown
  /** Format a date */
  d(value: Date | number, style?: string): string
  /** Format a number */
  n(value: number, style?: string): string
  /** Format an ICU message string directly */
  format(message: string, values?: Record<string, unknown>): string
  /** Reactive locale ref (synced across both libraries) */
  locale: Readonly<Ref<string>>
  /** Change locale (syncs to both libraries) */
  setLocale(locale: string): Promise<void>
  /** All available locales from both libraries */
  availableLocales: ComputedRef<string[]>
  /** Whether fluenti is loading a locale chunk */
  isLoading: Readonly<Ref<boolean>>
  /** Access the underlying fluenti context */
  fluenti: FluentVueContext
  /** Access the underlying vue-i18n global composer */
  vueI18n: VueI18nGlobal
}

/** Return type of createFluentBridge() */
export interface BridgePlugin {
  /** Vue plugin install method */
  install(app: any): void
  /** The global bridge context */
  global: BridgeContext
}
