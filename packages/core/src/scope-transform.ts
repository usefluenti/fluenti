import { scopeTransformAst } from './scope-transform-ast'
import { getGenerateCode } from './scope-codegen'

export { scopeTransformAst } from './scope-transform-ast'
export type { ScopeTransformAstResult } from './scope-transform-ast'
export type { Replacement, ScopeTransformOptions, ScopeTransformResult } from './scope-types'

import type { ScopeTransformOptions, ScopeTransformResult } from './scope-types'
import { FLUENTI_PACKAGES } from './scope-types'

const VALID_FRAMEWORKS = new Set(Object.keys(FLUENTI_PACKAGES))

export function scopeTransform(
  code: string,
  options: ScopeTransformOptions,
): ScopeTransformResult {
  if (!VALID_FRAMEWORKS.has(options.framework)) {
    console.warn(
      `[fluenti] Unknown framework "${options.framework}" in scopeTransform. ` +
      `Expected one of: ${[...VALID_FRAMEWORKS].join(', ')}. ` +
      `Transform will still run but framework-specific imports may not be detected.`,
    )
  }
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
