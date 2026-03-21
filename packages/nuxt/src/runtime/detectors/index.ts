import type { LocaleDetectContext, LocaleDetectorFn, FluentNuxtRuntimeConfig } from '../../types'
import detectPath from './path'
import detectCookie from './cookie'
import detectHeader from './header'
import detectQuery from './query'
import detectDomain from './domain'

/** Map of built-in detector names to their implementations */
const builtinDetectors: Record<string, LocaleDetectorFn> = {
  path: detectPath,
  cookie: detectCookie,
  header: detectHeader,
  query: detectQuery,
  domain: detectDomain,
}

/**
 * Run the detection chain: iterate through detectOrder, then fire the hook.
 *
 * Returns the detected locale or the defaultLocale as fallback.
 */
export async function runDetectors(
  path: string,
  config: FluentNuxtRuntimeConfig,
  customDetectors?: Map<string, LocaleDetectorFn>,
  hookFn?: (ctx: LocaleDetectContext) => void | Promise<void>,
  host?: string,
): Promise<string> {
  let resolved: string | null = null
  let stopped = false

  const ctx: LocaleDetectContext = {
    path,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    strategy: config.strategy,
    ...(config.detectBrowserLanguage ? { detectBrowserLanguage: config.detectBrowserLanguage } : {}),
    detectedLocale: null,
    setLocale(locale: string) {
      if (config.locales.includes(locale)) {
        resolved = locale
        ctx.detectedLocale = locale
        stopped = true
      }
    },
    isServer: import.meta.server ?? false,
    ...(host ? { host } : {}),
  }

  // Attach domains to context for domain detector
  if (config.domains) {
    Object.assign(ctx, { domains: config.domains })
  }

  // 1. Run detectors in order
  for (const name of config.detectOrder) {
    if (stopped) break

    const detector = builtinDetectors[name] ?? customDetectors?.get(name)
    if (detector) {
      await detector(ctx)
    }
  }

  // 2. Fire the hook — allows overriding or supplementing the detection chain
  if (hookFn && !stopped) {
    await hookFn(ctx)
  }

  // 3. Fallback
  return resolved ?? config.detectBrowserLanguage?.fallbackLocale ?? config.defaultLocale
}

export { builtinDetectors }
export type { LocaleDetectContext, LocaleDetectorFn }
