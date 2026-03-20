/**
 * Browser-safe subset of @fluenti/core/internal.
 *
 * Excludes `scopeTransform` (requires `node:module` + `@babel/generator`)
 * but exposes `scopeTransformAst` which produces a mutated Babel AST
 * without any Node.js-only dependencies.
 */
export { transformTransComponents } from './trans-transform'
export type { TransTransformResult } from './trans-transform'
export { scopeTransformAst } from './scope-transform-ast'
export type { ScopeTransformAstResult } from './scope-transform-ast'
export type { ScopeTransformOptions } from './scope-types'
export {
  canonicalizeMessageIdentity,
  createMessageId,
  resolveDescriptorId,
  isGeneratedMessageId,
} from './identity'
export {
  parseSourceModule,
  walkSourceAst,
  isSourceNode,
} from './source-analysis'
export type {
  SourceNode,
  SourceLocation,
  SourceLocationPoint,
} from './source-analysis'
