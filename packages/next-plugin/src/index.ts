/**
 * @fluenti/next — Next.js plugin for Fluenti
 *
 * Provides:
 * - `withFluenti()` — wraps next.config.ts with t`` transform support
 * - FluentProvider — async server component (exported from generated module)
 * - Webpack loader for strict, binding-aware tagged-template optimization
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withFluenti } from '@fluenti/next'
 * export default withFluenti()({ reactStrictMode: true })
 * ```
 */
export { withFluenti } from './with-fluenti'
export type { WithFluentConfig, FluentProviderProps } from './types'
