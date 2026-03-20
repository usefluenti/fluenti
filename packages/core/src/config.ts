/**
 * @module @fluenti/core/config
 *
 * Config loading utilities. Import from this subpath to avoid pulling
 * jiti and Node.js modules into client bundles.
 *
 * @example
 * ```ts
 * import { loadConfig, loadConfigSync } from '@fluenti/core/config'
 * const config = await loadConfig()
 * ```
 */
export { loadConfig, loadConfigSync, DEFAULT_FLUENTI_CONFIG } from './config-loader'
export { defineConfig } from './define-config'
