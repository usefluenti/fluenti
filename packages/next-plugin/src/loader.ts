/**
 * Webpack loader for t`` and t() transforms in Next.js.
 *
 * Runs as enforce: 'pre' to transform source before other loaders.
 * Only statically provable `t` bindings are optimized; runtime `t()` calls
 * continue to work without injected proxy globals.
 */
import { createTransformPipeline, hasScopeTransformCandidate } from '@fluenti/core/transform'

const pipeline = createTransformPipeline({ framework: 'react' })

/**
 * Webpack loader function.
 * `this` is the webpack LoaderContext.
 */
export default function fluentLoader(this: LoaderContext, source: string): string {
  // Only process .tsx, .ts, .jsx, .js files
  if (!/\.[jt]sx?$/.test(this.resourcePath)) {
    return source
  }

  // Skip node_modules and .next directory
  if (/node_modules|\.next/.test(this.resourcePath)) {
    return source
  }

  let result = source
  const isClientModule = /^\s*['"]use client['"]/.test(result)

  // ── <Trans> compile-time optimization (JSX/TSX only) ──────────────
  if (/\.[jt]sx$/.test(this.resourcePath) && /<Trans[\s>]/.test(result)) {
    const transResult = pipeline.transformTrans(result)
    if (transResult.transformed) {
      result = transResult.code
    }
  }

  if (isClientModule && /\.[jt]sx$/.test(this.resourcePath) && /<(Plural|Select)[\s/>]/.test(result)) {
    const componentResult = pipeline.transformPluralSelect(result, '@fluenti/react/components')
    if (componentResult.transformed) {
      result = componentResult.code
    }
  }

  // Quick check: does this file contain any Fluenti patterns?
  if (!hasScopeTransformCandidate(result)) {
    return result
  }

  // Try scope-aware transform (AST-based, zero false positives)
  try {
    const scoped = pipeline.transformScope(result, {
      componentModuleImport: isClientModule ? '@fluenti/react/components' : '@fluenti/next',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: !isClientModule,
      rerouteServerAuthoringImports: !isClientModule,
      errorOnServerUseI18n: !isClientModule,
    })
    if (scoped.transformed) {
      return scoped.code
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`[fluenti] Transform failed in ${this.resourcePath}: ${msg}`)
  }

  return result
}

interface LoaderContext {
  resourcePath: string
  getOptions(): Record<string, unknown>
}
