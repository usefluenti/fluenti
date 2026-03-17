/**
 * Webpack loader for t`` and t() transforms in Next.js.
 *
 * Runs as enforce: 'pre' to transform source before other loaders.
 * Detects server vs client context and injects the appropriate import.
 */
import { transformTaggedTemplate, detectInjectionMode, injectI18nImport } from './transform'
import { scopeTransform } from './scope-transform'
import { transformTransComponents } from './trans-transform'

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

  // ── <Trans> compile-time optimization (JSX/TSX only) ──────────────
  if (/\.[jt]sx$/.test(this.resourcePath) && /<Trans[\s>]/.test(result)) {
    const transResult = transformTransComponents(result)
    if (transResult.transformed) {
      result = transResult.code
    }
  }

  // Quick check: does this file contain t` or standalone t( ?
  if (!hasFluentPatterns(result)) {
    return result
  }

  // Try scope-aware transform first (AST-based, zero false positives)
  const scoped = scopeTransform(result, { framework: 'react' })
  if (scoped.transformed) {
    // Scope transform rewrites t`...` → t('...', { ... }) but doesn't
    // inject __i18n — the rewritten t() calls are still bound to the
    // user's local `t` from useI18n(), so no import injection needed.
    return scoped.code
  }

  // Fall back to legacy regex transform for files without useI18n import
  const { code, needsImport } = transformTaggedTemplate(result)

  if (!needsImport) {
    return result
  }

  const mode = detectInjectionMode(result, this.resourcePath)

  // For server files, import __getServerI18n from the generated module.
  // Use the webpack alias '@fluenti/next/__generated' which resolves
  // to the generated server module path.
  return injectI18nImport(code, mode, '@fluenti/next/__generated')
}

/**
 * Quick regex check to avoid full parsing on files without t`` or t().
 */
function hasFluentPatterns(code: string): boolean {
  return /\bt`/.test(code) || /(?<![.\w$])t\(\s*['"]/.test(code)
}

interface LoaderContext {
  resourcePath: string
  getOptions(): Record<string, unknown>
}
