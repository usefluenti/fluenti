// Low-level APIs for framework packages and tools
// End users should use @fluenti/core instead

export type { ASTNode, TextNode, VariableNode, PluralNode, SelectNode, FunctionNode, ParseMessage, CompileMessage } from './types'
export { parse, FluentParseError } from './parser'
export { compile, clearCompileCache } from './compile'
export { interpolate, clearInterpolationCache, setMessageCacheSize, DEFAULT_MESSAGE_CACHE_SIZE } from './interpolate'
export { resolvePlural, resolvePluralCategory, clearPluralCache } from './plural'
export { Catalog } from './catalog'
export { buildICUMessage } from './msg'
export { resolveDescriptorId, hashMessage } from './identity'
export {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from './icu-builders'
export type { PluralCategory } from './icu-builders'
export { createPluginRunner } from './plugin'
export type { PluginRunner, ExtractedMessages } from './plugin'
export { createDiagnostics } from './diagnostics'
export type { DiagnosticsConfig, DiagnosticEvent, Diagnostics } from './diagnostics'
export { LRUCache, stableCacheKey } from './lru'
