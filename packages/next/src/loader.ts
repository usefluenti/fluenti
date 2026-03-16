/**
 * Webpack/Turbopack loader for Fluenti.
 *
 * Transforms t`tagged templates` and t() calls in React components
 * into __i18n.t() calls with auto-injected useI18n hook.
 */

import { transform } from './transform'

export default function fluentiLoader(this: any, source: string): string {
  const resourcePath: string = this.resourcePath ?? ''
  const result = transform(source, resourcePath)
  if (!result) return source
  return result.code
}
