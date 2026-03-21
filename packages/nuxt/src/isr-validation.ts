import type { FluentNuxtOptions, Strategy } from './types'

export interface ISRWarning {
  level: 'warn' | 'error'
  message: string
}

/**
 * Validate ISR configuration against locale detection settings.
 *
 * ISR caches responses by URL path. If locale detection relies on
 * non-path signals (cookies, headers), the cached response may serve
 * the wrong locale to subsequent visitors.
 */
export function validateISRConfig(
  isr: FluentNuxtOptions['isr'],
  strategy: Strategy,
  detectOrder: string[],
): ISRWarning[] {
  const warnings: ISRWarning[] = []
  if (!isr?.enabled) return warnings

  const nonPathDetectors = detectOrder.filter(
    (d) => d === 'cookie' || d === 'header',
  )
  if (nonPathDetectors.length > 0) {
    warnings.push({
      level: 'warn',
      message:
        `[@fluenti/nuxt] ISR is enabled but detectOrder includes non-path ` +
        `detectors (${nonPathDetectors.join(', ')}). ISR caches by URL path, ` +
        `so cookie/header-based detection may serve the wrong locale from ` +
        `cache. Consider using detectOrder: ['path'] with ISR.`,
    })
  }

  if (strategy === 'no_prefix') {
    warnings.push({
      level: 'warn',
      message:
        `[@fluenti/nuxt] ISR is enabled with strategy: 'no_prefix'. All ` +
        `locales share the same URL path, so ISR will cache only one locale ` +
        `per URL. Use 'prefix' or 'prefix_except_default' strategy with ISR.`,
    })
  }

  return warnings
}
