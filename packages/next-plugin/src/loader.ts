/**
 * Webpack loader for t`` and t() transforms in Next.js.
 *
 * Runs as enforce: 'pre' to transform source before other loaders.
 * Detects server vs client context and injects the appropriate import.
 */
import { transformTaggedTemplate, detectInjectionMode, injectI18nImport } from './transform'

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

  // Quick check: does this file contain t` or standalone t( ?
  if (!hasFluentPatterns(source)) {
    return source
  }

  const { code, needsImport } = transformTaggedTemplate(source)

  if (!needsImport) {
    return source
  }

  const mode = detectInjectionMode(source, this.resourcePath)

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
