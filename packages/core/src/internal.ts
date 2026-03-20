export { transformTransComponents } from './trans-transform'
export type { TransTransformResult } from './trans-transform'
export { scopeTransform } from './scope-transform'
export type { ScopeTransformOptions, ScopeTransformResult, Replacement } from './scope-transform'
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
