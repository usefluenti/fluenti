/**
 * Webpack loader for t`` and t() transforms in Next.js.
 *
 * Runs as enforce: 'pre' to transform source before other loaders.
 * Only statically provable `t` bindings are optimized; runtime `t()` calls
 * continue to work without injected proxy globals.
 */
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
  const isClientModule = /^\s*['"]use client['"]/.test(result)

  // ── <Trans> compile-time optimization (JSX/TSX only) ──────────────
  if (/\.[jt]sx$/.test(this.resourcePath) && /<Trans[\s>]/.test(result)) {
    const transResult = transformTransComponents(result)
    if (transResult.transformed) {
      result = transResult.code
    }
  }

  // Quick check: does this file contain any Fluenti authoring/runtime surface?
  if (!isServerFluentiFile(result, isClientModule) && !hasFluentPatterns(result)) {
    return result
  }

  // Try scope-aware transform first (AST-based, zero false positives)
  try {
    const scoped = scopeTransform(result, {
      framework: 'react',
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

/**
 * Quick regex check to avoid full parsing on files without t`` or t().
 */
function hasFluentPatterns(code: string): boolean {
  if (/(?<![.\w$])t\(\s*['"]/.test(code) || /[A-Za-z_$][\w$]*\(\s*\{/.test(code)) {
    return true
  }

  if (/[A-Za-z_$][\w$]*`/.test(code) && (code.includes('useI18n') || code.includes('getI18n'))) {
    return true
  }

  return /import\s*\{\s*t(?:\s+as\s+[A-Za-z_$][\w$]*)?[\s,}]/.test(code)
    && (code.includes('@fluenti/react') || code.includes('@fluenti/next'))
}

function isServerFluentiFile(code: string, isClientModule: boolean): boolean {
  if (isClientModule) return false
  if (!code.includes('@fluenti/react') && !code.includes('@fluenti/next')) {
    return false
  }

  return /\b(useI18n|Trans|Plural|Select|DateTime|NumberFormat|t)\b/.test(code)
}

interface LoaderContext {
  resourcePath: string
  getOptions(): Record<string, unknown>
}
