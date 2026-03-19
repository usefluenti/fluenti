import { describe, expect, it } from 'vitest'
import fluentLoader from '../src/loader'

function createLoaderContext(resourcePath: string) {
  return {
    resourcePath,
    getOptions: () => ({
      serverModulePath: '/project/node_modules/.fluenti/server.js',
    }),
  }
}

describe('fluentLoader', () => {
  it('optimizes client tagged templates with a proven useI18n binding', () => {
    const ctx = createLoaderContext('/project/src/components/Nav.tsx')
    const source = [
      "'use client'",
      "import { useI18n } from '@fluenti/react'",
      'export function Nav() {',
      '  const { t } = useI18n()',
      '  return t`Home`',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result.indexOf("'use client'")).toBe(0)
    expect(result).toContain("return t({ id:")
    expect(result).toContain("message: 'Home' })")
    expect(result).not.toContain('globalThis.__fluenti_i18n')
    expect(result).not.toContain('t`Home`')
  })

  it('optimizes server tagged templates with await getI18n()', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { getI18n } from '@fluenti/next'",
      'export default async function Page() {',
      '  const { t } = await getI18n()',
      '  return t`Welcome`',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("return t({ id:")
    expect(result).toContain("message: 'Welcome' })")
    expect(result).not.toContain('__getServerI18n')
    expect(result).not.toContain('t`Welcome`')
  })

  it('supports renamed server bindings from @fluenti/next/server', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { getI18n } from '@fluenti/next/server'",
      'export default async function Page() {',
      '  const { t: translate } = await getI18n()',
      '  return translate`Stats`',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("return translate({ id:")
    expect(result).toContain("message: 'Stats' })")
    expect(result).not.toContain('translate`Stats`')
  })

  it('supports direct-import t from the generated server module in async scopes', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { t } from '@fluenti/next'",
      'export default async function Page() {',
      '  return <h1>{t`Welcome ${name}`}</h1>',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("import { getI18n } from '@fluenti/next'")
    expect(result).toMatch(/const __fluenti(?:_server)?_get_i18n = async \(\) =>/)
    expect(result).toContain('await getI18n()')
    expect(result).toMatch(/\(await __fluenti(?:_server)?_get_i18n\(\)\)\.t\(\{ id:/)
    expect(result).not.toContain("import { t } from '@fluenti/next'")
  })

  it('supports direct-import t from @fluenti/react in async server scopes', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { t } from '@fluenti/react'",
      'export default async function Page() {',
      '  return <h1>{t`Welcome ${name}`}</h1>',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("import { getI18n } from '@fluenti/next'")
    expect(result).toMatch(/const __fluenti(?:_server)?_get_i18n = async \(\) =>/)
    expect(result).toContain('await getI18n()')
    expect(result).toMatch(/\(await __fluenti(?:_server)?_get_i18n\(\)\)\.t\(\{ id:/)
    expect(result).not.toContain("import { t } from '@fluenti/react'")
  })

  it('reroutes server authoring components from @fluenti/react to the generated server module', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react'",
      'export default async function Page() {',
      '  return (',
      '    <>',
      '      <Trans>Hello</Trans>',
      '      <Plural value={1} one="# item" other="# items" />',
      '      <Select value="male" male="He" other="They" />',
      '      <DateTime value={Date.now()} />',
      '      <NumberFormat value={1234} />',
      '    </>',
      '  )',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain("import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/next'")
    expect(result).not.toContain("from '@fluenti/react'")
  })

  it('auto-promotes sync server component to async when using direct-import t', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { t } from '@fluenti/next'",
      'export default function Page() {',
      '  return <h1>{t`Welcome`}</h1>',
      '}',
    ].join('\n')

    const result = fluentLoader.call(ctx as never, source)
    expect(result).toContain('async function Page()')
    expect(result).toContain('__fluenti_get_i18n')
  })

  it('keeps direct t() calls as runtime code', () => {
    const ctx = createLoaderContext('/project/src/components/Card.tsx')
    const source = [
      "'use client'",
      "import { useI18n } from '@fluenti/react'",
      'export function Card() {',
      '  const { t } = useI18n()',
      "  return t('Welcome')",
      '}',
    ].join('\n')

    expect(fluentLoader.call(ctx as never, source)).toBe(source)
  })

  it('throws when useI18n is imported in a server file', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { useI18n } from '@fluenti/react'",
      'export default async function Page() {',
      '  const { t } = useI18n()',
      "  return <h1>{t('Welcome')}</h1>",
      '}',
    ].join('\n')

    expect(() => fluentLoader.call(ctx as never, source)).toThrow(/useI18n/i)
  })

  it('throws when the same compile-time symbol is imported from both react and the generated server module', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = [
      "import { Trans } from '@fluenti/react'",
      "import { Trans as ServerTrans } from '@fluenti/next'",
      'export default async function Page() {',
      '  return <Trans>Hello</Trans>',
      '}',
    ].join('\n')

    expect(() => fluentLoader.call(ctx as never, source)).toThrow(/both '@fluenti\/react' and '@fluenti\/next'/)
  })

  it('does not rewrite unbound tagged templates or method calls', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const unbound = 'const title = t`Hello`'
    const methodCall = "const title = i18n.t('Hello')"

    expect(fluentLoader.call(ctx as never, unbound)).toBe(unbound)
    expect(fluentLoader.call(ctx as never, methodCall)).toBe(methodCall)
  })

  it('skips files without Fluenti patterns', () => {
    const ctx = createLoaderContext('/project/src/app/page.tsx')
    const source = "export default function Page() { return 'hello' }"

    expect(fluentLoader.call(ctx as never, source)).toBe(source)
  })

  it('skips node_modules, .next output, and non-JS files', () => {
    const taggedTemplate = "const x = t`Hello`"
    const css = '.hello { color: red }'

    expect(
      fluentLoader.call(createLoaderContext('/project/node_modules/pkg/index.tsx') as never, taggedTemplate),
    ).toBe(taggedTemplate)
    expect(
      fluentLoader.call(createLoaderContext('/project/.next/server/app/page.js') as never, taggedTemplate),
    ).toBe(taggedTemplate)
    expect(
      fluentLoader.call(createLoaderContext('/project/src/styles.css') as never, css),
    ).toBe(css)
  })
})
