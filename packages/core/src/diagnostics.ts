// ============================================================
// @fluenti/core — Runtime Diagnostics
// Zero-cost in production (tree-shakeable via __DEV__ guard)
// ============================================================

import type { Locale } from './types'

// ---- Public Types ----

export interface DiagnosticEvent {
  readonly type: 'missing-key' | 'fallback-used' | 'parse-error' | 'format-error'
  readonly locale: string
  readonly messageId?: string
  readonly fallbackLocale?: string
  readonly error?: Error
  readonly timestamp: number
}

export interface DiagnosticsConfig {
  /** Warn when a message key is not found in any locale */
  warnMissing?: boolean
  /** Warn when falling back to a different locale */
  warnFallback?: boolean
  /** Custom reporter (defaults to console.warn) */
  reporter?: (event: DiagnosticEvent) => void
}

// ---- DEV flag (replaced by build tools) ----

/**
 * Development-mode flag for tree-shaking diagnostics.
 *
 * Build tools (Vite, webpack, esbuild) replace this with `false` in
 * production builds, allowing dead-code elimination of all diagnostic
 * calls wrapped in `if (__DEV__)` blocks.
 *
 * Falls back to runtime detection via `import.meta.env?.DEV` or
 * `process.env.NODE_ENV !== 'production'`.
 */
export const __DEV__: boolean = /* @__PURE__ */ (() => {
  try {
    // Vite / esbuild
    if (typeof import.meta !== 'undefined' && import.meta.env != null) {
      return !!import.meta.env.DEV
    }
  } catch {
    // import.meta not available
  }
  try {
    // Node / webpack
    if (typeof process !== 'undefined' && process.env != null) {
      return process.env['NODE_ENV'] !== 'production'
    }
  } catch {
    // process not available
  }
  return false
})()

// ---- Diagnostics Interface ----

export interface Diagnostics {
  /** Report a missing message key */
  readonly missingKey: (locale: Locale, messageId: string) => void
  /** Report a fallback locale being used */
  readonly fallbackUsed: (locale: Locale, fallbackLocale: Locale, messageId: string) => void
  /** Report a parse error */
  readonly parseError: (locale: Locale, messageId: string, error: Error) => void
  /** Report a format error */
  readonly formatError: (locale: Locale, messageId: string, error: Error) => void
  /** Whether diagnostics are active */
  readonly enabled: boolean
}

// ---- No-op Diagnostics (production) ----

const noop = (): void => {}

const NOOP_DIAGNOSTICS: Diagnostics = {
  missingKey: noop,
  fallbackUsed: noop,
  parseError: noop,
  formatError: noop,
  enabled: false,
}

// ---- Default Reporter ----

function defaultReporter(event: DiagnosticEvent): void {
  const prefix = '[fluenti:diagnostics]'
  switch (event.type) {
    case 'missing-key':
      console.warn(`${prefix} Missing key "${event.messageId}" for locale "${event.locale}"`)
      break
    case 'fallback-used':
      console.warn(
        `${prefix} Fallback from "${event.locale}" to "${event.fallbackLocale}" for key "${event.messageId}"`,
      )
      break
    case 'parse-error':
      console.warn(`${prefix} Parse error for key "${event.messageId}" in locale "${event.locale}"`, event.error)
      break
    case 'format-error':
      console.warn(`${prefix} Format error for key "${event.messageId}" in locale "${event.locale}"`, event.error)
      break
  }
}

// ---- Factory ----

function createEvent(
  type: DiagnosticEvent['type'],
  locale: string,
  messageId?: string,
  fallbackLocale?: string,
  error?: Error,
): DiagnosticEvent {
  return Object.freeze({
    type,
    locale,
    messageId,
    fallbackLocale,
    error,
    timestamp: Date.now(),
  })
}

/**
 * Create a diagnostics instance for development-time i18n issue reporting.
 *
 * In production builds, returns a no-op implementation that is fully
 * tree-shakeable when guarded with `if (__DEV__)`.
 *
 * @example
 * ```ts
 * const diagnostics = createDiagnostics({
 *   warnMissing: true,
 *   warnFallback: true,
 *   reporter: (event) => myLogger.warn(event),
 * })
 * ```
 */
export function createDiagnostics(config: DiagnosticsConfig = {}): Diagnostics {
  if (!__DEV__) {
    return NOOP_DIAGNOSTICS
  }

  const { warnMissing = true, warnFallback = true } = config
  const reporter = config.reporter ?? defaultReporter

  return Object.freeze({
    missingKey: warnMissing
      ? (locale: Locale, messageId: string): void => {
          reporter(createEvent('missing-key', locale, messageId))
        }
      : noop,

    fallbackUsed: warnFallback
      ? (locale: Locale, fallbackLocale: Locale, messageId: string): void => {
          reporter(createEvent('fallback-used', locale, messageId, fallbackLocale))
        }
      : noop,

    parseError: (locale: Locale, messageId: string, error: Error): void => {
      reporter(createEvent('parse-error', locale, messageId, undefined, error))
    },

    formatError: (locale: Locale, messageId: string, error: Error): void => {
      reporter(createEvent('format-error', locale, messageId, undefined, error))
    },

    enabled: true,
  })
}
