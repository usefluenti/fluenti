/**
 * Compiler/build helpers for plugins, CLIs, and framework integrations.
 *
 * Import from `@fluenti/core/compiler` for parser, compiler, config, and
 * extraction APIs. These exports are intentionally separated from
 * `@fluenti/core/runtime` to keep client bundles lean and predictable.
 */

// Parser / compiler.
export type {
  ASTNode,
  TextNode,
  VariableNode,
  PluralNode,
  SelectNode,
  FunctionNode,
  ParseMessage,
  CompileMessage,
} from './types'
export { parse, FluentParseError } from './parser'
export { compile, clearCompileCache } from './compile'

// Shared message/config helpers used by build tools.
export { buildICUMessage } from './msg'
export {
  PLURAL_CATEGORIES,
  buildICUPluralMessage,
  buildICUSelectMessage,
  normalizeSelectForms,
  offsetIndices,
} from './icu-builders'
export type { PluralCategory } from './icu-builders'
export { hashMessage, resolveDescriptorId } from './identity'
export { resolveLocaleCodes, normalizeConfig } from './types'
export type {
  FluentiBuildConfig,
  SplitRuntimeModule,
  SSRLocaleScriptOptions,
  HydratedLocaleOptions,
  ExtractedMessage,
  FluentiPlugin,
  PluginExtractContext,
  PluginCompileContext,
} from './types'

// Plugin/diagnostic utilities used by tooling.
export { createPluginRunner } from './plugin'
export type { PluginRunner, ExtractedMessages } from './plugin'
export { createDiagnostics } from './diagnostics'
export type { DiagnosticsConfig, DiagnosticEvent, Diagnostics } from './diagnostics'
export { LRUCache, stableCacheKey } from './lru'
