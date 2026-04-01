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
export { defineRouting } from './routing'
export type { RoutingConfig } from './routing'
export { msg } from '@fluenti/react'

// ── Runtime stubs ────────────────────────────────────────────────────
// TypeScript resolves types from this file (via package.json exports).
// At runtime, webpack `resolve.alias` redirects `@fluenti/next$` to the
// generated server module, so these stubs are never actually called in
// a correctly configured project. They exist only to provide helpful
// errors if `withFluenti()` is not configured.

import type { ReactNode, ReactElement } from 'react'
import type { CompileTimeT, FluentiCoreInstanceFull } from '@fluenti/core'
import type { I18nProviderProps } from './types'

interface NextTransProps {
  children: ReactNode
  id?: string
  context?: string
  comment?: string
  render?: (translation: ReactNode) => ReactNode
}

interface NextPluralProps {
  value: number
  id?: string
  context?: string
  comment?: string
  zero?: ReactNode
  one?: ReactNode
  two?: ReactNode
  few?: ReactNode
  many?: ReactNode
  other: ReactNode
  offset?: number
}

interface NextSelectProps {
  value: string
  id?: string
  context?: string
  comment?: string
  other: ReactNode
  options?: Record<string, ReactNode>
  [key: string]: ReactNode | Record<string, ReactNode> | string | undefined
}

interface NextDateTimeProps {
  value: Date | number
  style?: string
}

interface NextNumberFormatProps {
  value: number
  style?: string
}

const NOT_CONFIGURED = [
  '[fluenti] `@fluenti/next` was imported before `withFluenti()` generated the server module.',
  'Fix this by:',
  "  1. Wrapping next.config.ts with `withFluenti()` from '@fluenti/next'",
  '  2. Restarting the Next dev server after the generated module is written',
  "  3. Importing client runtime APIs from '@fluenti/react' and server APIs from '@fluenti/next'",
].join('\n')

function throwNotConfigured(): never {
  throw new Error(NOT_CONFIGURED)
}

/** @see Generated module for the real implementation. */
export const setLocale: (locale: string) => void = throwNotConfigured
/** @see Generated module for the real implementation. */
export const getI18n: () => Promise<FluentiCoreInstanceFull & { locale: string }> = throwNotConfigured as () => Promise<FluentiCoreInstanceFull & { locale: string }>
/** @see Generated module for the real implementation. */
export const t: CompileTimeT = throwNotConfigured as unknown as CompileTimeT
/** @see Generated module for the real implementation. */
export async function Trans(_props: NextTransProps): Promise<ReactElement> {
  return throwNotConfigured()
}
/** @see Generated module for the real implementation. */
export async function Plural(_props: NextPluralProps): Promise<ReactElement> {
  return throwNotConfigured()
}
/** @see Generated module for the real implementation. */
export async function Select(_props: NextSelectProps): Promise<ReactElement> {
  return throwNotConfigured()
}
/** @see Generated module for the real implementation. */
export async function DateTime(_props: NextDateTimeProps): Promise<ReactElement> {
  return throwNotConfigured()
}
/** @see Generated module for the real implementation. */
export async function NumberFormat(_props: NextNumberFormatProps): Promise<ReactElement> {
  return throwNotConfigured()
}
/** @see Generated module for the real implementation. */
export async function I18nProvider(_props: I18nProviderProps): Promise<ReactElement> {
  return throwNotConfigured()
}
