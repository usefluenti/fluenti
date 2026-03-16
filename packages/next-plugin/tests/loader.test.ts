import { describe, it, expect } from 'vitest'
import fluentLoader from '../src/loader'

function createLoaderContext(
  resourcePath: string,
  options: Record<string, unknown> = {},
) {
  return {
    resourcePath,
    getOptions: () => ({
      serverModulePath: '/project/node_modules/.fluenti/server.js',
      ...options,
    }),
  }
}

describe('fluentLoader', () => {
  it('transforms t`` in client component', () => {
    const ctx = createLoaderContext('/project/src/components/Nav.tsx')
    const source = "'use client'\nexport function Nav() { return t`Home` }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('globalThis.__fluenti_i18n')
    expect(result).toContain("__i18n.t('Home')")
    // 'use client' must remain first
    expect(result.indexOf("'use client'")).toBe(0)
  })

  it('transforms t`` in RSC (app/ directory)', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = "export default function Page() { return t`Welcome` }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('__getServerI18n')
    expect(result).toContain("__i18n.t('Welcome')")
  })

  it('skips files without fluenti patterns', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = "export default function Page() { return 'hello' }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips node_modules', () => {
    const ctx = createLoaderContext('/project/node_modules/some-lib/index.ts')
    const source = "const x = t`Hello`"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips .next directory', () => {
    const ctx = createLoaderContext('/project/.next/server/page.tsx')
    const source = "const x = t`Hello`"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips non-JS files', () => {
    const ctx = createLoaderContext('/project/src/styles.css')
    const source = '.hello { color: red }'
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('treats pages/ directory as client', () => {
    const ctx = createLoaderContext('/project/pages/index.tsx')
    const source = "export default function Home() { return t`Hello` }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('globalThis.__fluenti_i18n')
  })

  it('transforms standalone t() calls', () => {
    const ctx = createLoaderContext('/project/src/components/Card.tsx')
    const source = "'use client'\nexport function Card() { return t('Welcome') }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("__i18n.t('Welcome')")
  })
})
