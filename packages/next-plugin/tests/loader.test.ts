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

  // --- Edge case tests ---

  it('skips non-JS files like .json', () => {
    const ctx = createLoaderContext('/project/src/data.json')
    const source = '{ "key": "value" }'
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips non-JS files like .md', () => {
    const ctx = createLoaderContext('/project/README.md')
    const source = '# Hello with t`template`'
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips node_modules in nested paths', () => {
    const ctx = createLoaderContext('/project/node_modules/@some-scope/pkg/dist/index.js')
    const source = "const x = t`Hello`"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips .next build output files', () => {
    const ctx = createLoaderContext('/project/.next/static/chunks/app/page.js')
    const source = "const x = t`Hello`"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('skips files without any fluent patterns', () => {
    const ctx = createLoaderContext('/project/src/app/layout.tsx')
    const source = 'export default function Layout({ children }) { return children }'
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toBe(source)
  })

  it('transforms file containing t`` tagged template', () => {
    const ctx = createLoaderContext('/project/src/components/Header.tsx')
    const source = "'use client'\nconst title = t`Dashboard`"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("__i18n.t('Dashboard')")
    expect(result).toContain('globalThis.__fluenti_i18n')
  })

  it('transforms file containing t() function call', () => {
    const ctx = createLoaderContext('/project/src/components/Footer.tsx')
    const source = "'use client'\nconst label = t('Copyright')"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("__i18n.t('Copyright')")
  })

  it('app/ directory file injects server import', () => {
    const ctx = createLoaderContext('/project/app/dashboard/page.tsx')
    const source = "export default function Dashboard() { return t`Stats` }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('__getServerI18n')
    expect(result).not.toContain('globalThis.__fluenti_i18n')
  })

  it('pages/ directory file injects client import', () => {
    const ctx = createLoaderContext('/project/pages/about.tsx')
    const source = "export default function About() { return t`About us` }"
    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('globalThis.__fluenti_i18n')
    expect(result).not.toContain('__getServerI18n')
  })

  it('hasFluentPatterns detects t`` but not other backtick templates', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')

    // Should NOT transform: regular template literal
    const noMatch = "const x = `hello ${name}`"
    expect(fluentLoader.call(ctx as never, noMatch)).toBe(noMatch)

    // Should transform: t`` tagged template
    const match = "const x = t`hello`"
    expect(fluentLoader.call(ctx as never, match)).not.toBe(match)
  })

  it('hasFluentPatterns detects standalone t() but not method .t()', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')

    // Should NOT transform: method call .t()
    const noMatch = "const x = i18n.t('hello')"
    expect(fluentLoader.call(ctx as never, noMatch)).toBe(noMatch)

    // Should transform: standalone t()
    const match = "const x = t('hello')"
    expect(fluentLoader.call(ctx as never, match)).not.toBe(match)
  })
})
