import { scopeTransformAst } from './scope-transform-ast'
import { getGenerateCode } from './scope-codegen'

export { scopeTransformAst } from './scope-transform-ast'
export type { ScopeTransformAstResult } from './scope-transform-ast'
export type { Replacement, ScopeTransformOptions, ScopeTransformResult } from './scope-types'

import type { ScopeTransformOptions, ScopeTransformResult } from './scope-types'

export function scopeTransform(
  code: string,
  options: ScopeTransformOptions,
): ScopeTransformResult {
  const result = scopeTransformAst(code, options)
  if (!result.transformed) {
    return { code: result.code, transformed: false }
  }

  const output = getGenerateCode()(result.ast as never, {
    retainLines: true,
    jsescOption: { quotes: 'single', minimal: true },
  }).code

  return { code: output, transformed: true }
}
