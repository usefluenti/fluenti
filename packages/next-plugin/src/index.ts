/**
 * @fluenti/next — Next.js plugin for Fluenti
 *
 * Provides:
 * - `withFluenti()` — wraps next.config.ts with t`` transform support
 * - I18nProvider — async server component (exported from generated module)
 * - Webpack loader for strict, binding-aware tagged-template optimization
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withFluenti } from '@fluenti/next'
 * export default withFluenti()({ reactStrictMode: true })
 * ```
 *
 * @example
 * ```tsx
 * // app/layout.tsx — resolved by webpack alias to the generated module
 * import { I18nProvider } from '@fluenti/next'
 * ```
 */
export { withFluenti } from './with-fluenti'
export type { WithFluentConfig, I18nProviderProps } from './types'

// ── Runtime stubs ────────────────────────────────────────────────────
// TypeScript resolves types from this file (via package.json exports).
// At runtime, webpack `resolve.alias` redirects `@fluenti/next$` to the
// generated server module, so these stubs are never actually called in
// a correctly configured project. They exist only to provide helpful
// errors if `withFluenti()` is not configured.

import type { ReactNode, ReactElement } from 'react'
import type { CompileTimeT, FluentInstanceExtended } from '@fluenti/core'

const NOT_CONFIGURED =
  '[fluenti] `withFluenti()` must be configured in next.config.ts before importing from "@fluenti/next".'

function throwNotConfigured(): never {
  throw new Error(NOT_CONFIGURED)
}

/** @see Generated module for the real implementation. */
export const setLocale: (locale: string) => void = throwNotConfigured
/** @see Generated module for the real implementation. */
export const getI18n: () => Promise<FluentInstanceExtended & { locale: string }> = throwNotConfigured as () => Promise<FluentInstanceExtended & { locale: string }>
/** @see Generated module for the real implementation. */
export const t: CompileTimeT = throwNotConfigured as unknown as CompileTimeT
/** @see Generated module for the real implementation. */
export const Trans: (props: { children: ReactNode; id?: string; context?: string; comment?: string; render?: (translation: ReactNode) => ReactNode }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof Trans
/** @see Generated module for the real implementation. */
export const Plural: (props: { value: number; id?: string; context?: string; comment?: string; zero?: ReactNode; one?: ReactNode; two?: ReactNode; few?: ReactNode; many?: ReactNode; other: ReactNode; offset?: number }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof Plural
/** @see Generated module for the real implementation. */
export const Select: (props: { value: string; id?: string; context?: string; comment?: string; other: ReactNode; options?: Record<string, ReactNode>; [key: string]: ReactNode | Record<string, ReactNode> | string | undefined }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof Select
/** @see Generated module for the real implementation. */
export const DateTime: (props: { value: Date | number; style?: string }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof DateTime
/** @see Generated module for the real implementation. */
export const NumberFormat: (props: { value: number; style?: string }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof NumberFormat
/** @see Generated module for the real implementation. */
export const I18nProvider: (props: { locale?: string; children: ReactNode }) => Promise<ReactElement> = throwNotConfigured as unknown as typeof I18nProvider
