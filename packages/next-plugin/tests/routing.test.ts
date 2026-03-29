import { describe, it, expect } from 'vitest'
import {
  defineRouting,
  matchPattern,
  substituteParams,
  resolveInternalPath,
  resolveLocalizedPath,
} from '../src/routing'

describe('defineRouting', () => {
  it('returns the routing config unchanged', () => {
    const config = {
      locales: ['en', 'fr'] as const,
      sourceLocale: 'en' as const,
      pathnames: { '/about': { fr: '/a-propos' } },
    }
    expect(defineRouting(config)).toBe(config)
  })
})

describe('matchPattern', () => {
  it('matches static paths', () => {
    expect(matchPattern('/about', '/about')).toEqual({})
    expect(matchPattern('/about', '/contact')).toBeNull()
  })

  it('matches dynamic [param] segments', () => {
    expect(matchPattern('/blog/[slug]', '/blog/hello-world')).toEqual({ slug: 'hello-world' })
    expect(matchPattern('/blog/[slug]', '/blog')).toBeNull()
  })

  it('matches catch-all [...path] segments', () => {
    expect(matchPattern('/docs/[...path]', '/docs/getting-started/install')).toEqual({
      path: 'getting-started/install',
    })
    expect(matchPattern('/docs/[...path]', '/docs/intro')).toEqual({ path: 'intro' })
  })

  it('rejects mismatched segment count', () => {
    expect(matchPattern('/a/b', '/a')).toBeNull()
    expect(matchPattern('/a', '/a/b')).toBeNull()
  })

  it('matches multiple dynamic segments', () => {
    expect(matchPattern('/[lang]/[slug]', '/en/hello')).toEqual({ lang: 'en', slug: 'hello' })
  })
})

describe('substituteParams', () => {
  it('replaces [param] with values', () => {
    expect(substituteParams('/blog/[slug]', { slug: 'hello' })).toBe('/blog/hello')
  })

  it('replaces [...param] with values', () => {
    expect(substituteParams('/docs/[...path]', { path: 'a/b/c' })).toBe('/docs/a/b/c')
  })
})

describe('resolveLocalizedPath', () => {
  const pathnames = {
    '/about': { fr: '/a-propos', ja: '/about' },
    '/blog/[slug]': { fr: '/articles/[slug]' },
  }

  it('resolves exact match', () => {
    expect(resolveLocalizedPath('/about', 'fr', pathnames)).toBe('/a-propos')
  })

  it('resolves dynamic pattern', () => {
    expect(resolveLocalizedPath('/blog/hello', 'fr', pathnames)).toBe('/articles/hello')
  })

  it('returns null for unmapped locale', () => {
    expect(resolveLocalizedPath('/about', 'de', pathnames)).toBeNull()
  })

  it('returns null for unknown path', () => {
    expect(resolveLocalizedPath('/contact', 'fr', pathnames)).toBeNull()
  })
})

describe('resolveInternalPath', () => {
  const pathnames = {
    '/about': { fr: '/a-propos' },
    '/blog/[slug]': { fr: '/articles/[slug]' },
  }

  it('resolves exact match', () => {
    expect(resolveInternalPath('/a-propos', 'fr', pathnames)).toBe('/about')
  })

  it('resolves dynamic pattern', () => {
    expect(resolveInternalPath('/articles/hello', 'fr', pathnames)).toBe('/blog/hello')
  })

  it('returns null for unknown localized path', () => {
    expect(resolveInternalPath('/unknown', 'fr', pathnames)).toBeNull()
  })
})
