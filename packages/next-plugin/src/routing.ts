/**
 * Shared routing configuration for middleware and navigation.
 *
 * Define once, use everywhere:
 *
 * @example
 * ```ts
 * // src/i18n/routing.ts
 * import { defineRouting } from '@fluenti/next'
 *
 * export const routing = defineRouting({
 *   locales: ['en', 'fr', 'ja'],
 *   sourceLocale: 'en',
 *   localePrefix: 'as-needed',
 *   pathnames: {
 *     '/about': { fr: '/a-propos' },
 *     '/blog/[slug]': { fr: '/articles/[slug]' },
 *   },
 * })
 * ```
 *
 * Then pass to both middleware and navigation:
 * ```ts
 * // middleware.ts
 * export default createI18nMiddleware({ NextResponse, ...routing })
 *
 * // src/i18n/navigation.ts
 * export const { Link, useRouter } = createNavigation(routing)
 * ```
 */

export interface RoutingConfig<
  L extends string = string,
  P extends string = string,
> {
  locales: readonly L[]
  sourceLocale: L
  localePrefix?: 'always' | 'as-needed' | 'never'
  pathnames?: Record<P, Partial<Record<L, string>>>
}

/**
 * Define a routing configuration for use with both `createI18nMiddleware` and `createNavigation`.
 *
 * This is a type-only helper — it returns the input unchanged but captures
 * the literal types of locales and pathname keys for type-safe navigation.
 */
export function defineRouting<
  const L extends string,
  const P extends string,
>(config: RoutingConfig<L, P>): RoutingConfig<L, P> {
  return config
}

function getPatternSegments(pattern: string): string[] {
  return pattern.split('/').filter(Boolean)
}

function getSegmentPriority(segment: string | undefined): number {
  if (!segment) return 0
  if (segment.startsWith('[...') && segment.endsWith(']')) return 1
  if (segment.startsWith('[') && segment.endsWith(']')) return 2
  return 3
}

function comparePatterns(a: string, b: string): number {
  const aSegments = getPatternSegments(a)
  const bSegments = getPatternSegments(b)
  const maxLength = Math.max(aSegments.length, bSegments.length)

  for (let i = 0; i < maxLength; i++) {
    const aPriority = getSegmentPriority(aSegments[i])
    const bPriority = getSegmentPriority(bSegments[i])
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
  }

  if (aSegments.length !== bSegments.length) {
    return bSegments.length - aSegments.length
  }

  return a.localeCompare(b)
}

function getSortedPathnameEntries(
  pathnames: Record<string, Record<string, string>>,
): Array<[string, Record<string, string>]> {
  return Object.entries(pathnames).sort(([a], [b]) => comparePatterns(a, b))
}

// ── Shared path resolution utilities ──────────────────────────────────────

/** Match a pathname against a pattern with [param] and [...slug] segments. */
export function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)

  const params: Record<string, string> = {}

  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i]!
    if (pp.startsWith('[...') && pp.endsWith(']')) {
      const key = pp.slice(4, -1)
      params[key] = pathParts.slice(i).join('/')
      return params
    }
    if (pp.startsWith('[') && pp.endsWith(']')) {
      if (i >= pathParts.length) return null
      params[pp.slice(1, -1)] = pathParts[i]!
      continue
    }
    if (i >= pathParts.length || pp !== pathParts[i]) return null
  }

  if (patternParts.length !== pathParts.length) return null
  return params
}

/** Substitute params into a pattern. */
export function substituteParams(pattern: string, params: Record<string, string>): string {
  return pattern.replace(/\[\.\.\.(\w+)\]|\[(\w+)\]/g, (_, catchAll, param) => {
    const key = catchAll ?? param
    return params[key] ?? ''
  })
}

/** Reverse lookup: localized path → internal path. */
export function resolveInternalPath(
  localizedPath: string,
  locale: string,
  pathnames: Record<string, Record<string, string>>,
): string | null {
  for (const [internal, mapping] of getSortedPathnameEntries(pathnames)) {
    const localized = mapping[locale]
    if (!localized) continue
    if (localized === localizedPath) return internal
    const params = matchPattern(localized, localizedPath)
    if (params) return substituteParams(internal, params)
  }
  return null
}

/** Forward lookup: internal path → localized path. */
export function resolveLocalizedPath(
  internalPath: string,
  locale: string,
  pathnames: Record<string, Record<string, string>>,
): string | null {
  for (const [internal, mapping] of getSortedPathnameEntries(pathnames)) {
    const localized = mapping[locale]
    if (!localized) continue
    if (internal === internalPath) return localized
    const params = matchPattern(internal, internalPath)
    if (params) return substituteParams(localized, params)
  }
  return null
}
