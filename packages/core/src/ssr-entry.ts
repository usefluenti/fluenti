/**
 * SSR utilities for server-side locale detection and hydration.
 *
 * Import from `@fluenti/core/ssr` to keep the client bundle lean.
 *
 * @module
 */
export { detectLocale, getSSRLocaleScript, getHydratedLocale } from './ssr'
export type { DetectLocaleOptions, SSRLocaleScriptOptions, HydratedLocaleOptions } from './types'
