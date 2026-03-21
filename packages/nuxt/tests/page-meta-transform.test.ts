import { describe, it, expect } from 'vitest'
import { createPageMetaTransform } from '../src/page-meta-transform'

describe('createPageMetaTransform', () => {
  const plugin = createPageMetaTransform()
  const transform = plugin.transform as (code: string, id: string) => { code: string; map: null } | null

  it('transforms defineI18nRoute to definePageMeta', () => {
    const code = `defineI18nRoute({ locales: ['en', 'ja'] })`
    const result = transform(code, '/app/pages/about.vue')

    expect(result).not.toBeNull()
    expect(result!.code).toContain('definePageMeta')
    expect(result!.code).toContain("i18nRoute: { locales: ['en', 'ja'] }")
  })

  it('transforms defineI18nRoute(false)', () => {
    const code = `defineI18nRoute(false)`
    const result = transform(code, '/app/pages/login.vue')

    expect(result).not.toBeNull()
    expect(result!.code).toBe('definePageMeta({ i18nRoute: false })')
  })

  it('rewrites i18n: key to i18nRoute: in definePageMeta', () => {
    const code = `definePageMeta({ i18n: { locales: ['en'] } })`
    const result = transform(code, '/app/pages/about.vue')

    expect(result).not.toBeNull()
    expect(result!.code).toContain('i18nRoute:')
    expect(result!.code).not.toContain('i18n:')
  })

  it('returns null for non-pages files', () => {
    const code = `defineI18nRoute({ locales: ['en'] })`
    const result = transform(code, '/app/components/Header.vue')
    expect(result).toBeNull()
  })

  it('returns null when no i18n-related content', () => {
    const code = `const x = 1`
    const result = transform(code, '/app/pages/about.vue')
    expect(result).toBeNull()
  })
})
