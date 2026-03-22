/**
 * Internal APIs for framework packages and build tools.
 *
 * Application code should NOT import from this module.
 * Use `@fluenti/core` instead.
 *
 * @internal
 */

// ICU builders
export { buildICUMessage } from './msg'
export {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from './icu-builders'
export type { PluralCategory } from './icu-builders'

// Message identity
export { resolveDescriptorId, hashMessage } from './identity'

// Parser / compiler (low-level)
export type { ASTNode, TextNode, VariableNode, PluralNode, SelectNode, FunctionNode, ParseMessage, CompileMessage } from './types'
export { parse, FluentParseError } from './parser'
export { compile, clearCompileCache } from './compile'
export { interpolate, clearInterpolationCache, setMessageCacheSize, DEFAULT_MESSAGE_CACHE_SIZE } from './interpolate'

// Plural resolution
export { resolvePlural, resolvePluralCategory, clearPluralCache } from './plural'

// Catalog
export { Catalog } from './catalog'

// Cache management (granular)
export { clearNumberFormatCache, LOCALE_CURRENCY_MAP } from './formatters/number'
export { clearDateFormatCache } from './formatters/date'
export { clearRelativeTimeFormatCache } from './formatters/relative'

// Config utilities
export { resolveLocaleCodes, normalizeConfig } from './types'
export type {
  FluentiBuildConfig,
  SplitRuntimeModule,
  SSRLocaleScriptOptions,
  HydratedLocaleOptions,
  ExtractedMessage,
} from './types'

// Plugin system
export { createPluginRunner } from './plugin'
export type { PluginRunner, ExtractedMessages } from './plugin'

// Diagnostics
export { createDiagnostics } from './diagnostics'
export type { DiagnosticsConfig, DiagnosticEvent, Diagnostics } from './diagnostics'

// Utilities
export { LRUCache, stableCacheKey } from './lru'
