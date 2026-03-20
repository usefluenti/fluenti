import { describe, it, expect } from 'vitest'
import { scopeTransform } from '../src/scope-transform'
import { readImportedName, readPropertyKey, readStaticStringValue } from '../src/scope-read'
import type { SourceNode } from '../src/source-analysis'

describe('scopeTransform', () => {
  const opts = { framework: 'react' as const }

  it('transforms t`Hello` when t comes from useI18n()', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).not.toContain('t`Hello`')
  })

  it('does NOT transform when t is a local variable (const t = 5)', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const t = 5
const x = t
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('does NOT transform t in vitest callback', () => {
    const code = `
import { it } from 'vitest'
it('test', (t) => {
  console.log(t)
})
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
  })

  it('handles { t: translate } rename', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t: translate } = useI18n()
const msg = translate\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("translate({ id:")
    expect(result.code).toContain("message: 'Hello'")
  })

  it('handles nested scope shadowing — inner t not transformed', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Outer\`
function inner() {
  const t = 42
  const x = t
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Outer'")
    // The inner `t = 42` should not be touched
    expect(result.code).toContain('const t = 42')
  })

  it('does nothing when no useI18n import', () => {
    const code = `
const t = (s) => s
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('transforms tagged template with expressions', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const name = 'World'
const msg = t\`Hello \${name}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello {name}' }, { name: name })")
  })

  it('transforms multiple expressions', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const a = 'foo'
const b = 'bar'
const msg = t\`\${a} and \${b}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: '{a} and {b}' }, { a: a, b: b })")
  })

  it('uses positional index for complex expressions', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Result: \${1 + 2}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Result: {arg0}' }, { arg0: 1 + 2 })")
  })

  it('works with @fluenti/vue import', () => {
    const code = `
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, { framework: 'vue' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello'")
  })

  it('works with @fluenti/solid import', () => {
    const code = `
import { useI18n } from '@fluenti/solid'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, { framework: 'solid' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello'")
  })

  it('wraps vue expressions with unref()', () => {
    const code = `
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
const name = ref('World')
const msg = t\`Hello \${name}\`
`
    const result = scopeTransform(code, { framework: 'vue' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello {name}' }, { name: name })")
  })

  it('handles dotted expressions — uses last segment as name', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello \${user.name}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello {name}' }, { name: user.name })")
  })

  it('escapes single quotes in the ICU message', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`It's a test\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'It\\'s a test' })")
  })

  it('gracefully handles unparseable code', () => {
    const code = `this is not valid javascript {{{`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('handles multiple tagged templates in same file', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const a = t\`Hello\`
const b = t\`World\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("message: 'World'")
  })

  it('explicit react framework', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const name = 'World'
const msg = t\`Hello \${name}\`
`
    const result = scopeTransform(code, { framework: 'react' })
    expect(result.transformed).toBe(true)
    // React: no unref() wrapping
    expect(result.code).toContain("t({ id:")
    expect(result.code).toContain("message: 'Hello {name}' }, { name: name })")
    expect(result.code).not.toContain('unref')
  })

  it('transforms imported t() with string literal argument', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t('nav.home')
}
`

    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'nav.home'")
  })

  it('throws a stable error for unsupported direct-import client scopes', () => {
    const code = `
import { t } from '@fluenti/react'
const label = t\`Hello\`
`

    expect(() => scopeTransform(code, opts)).toThrow(
      /compile-time API/,
    )
  })

  it('auto-promotes sync server component to async when using imported t', () => {
    const code = `
import { t } from '@fluenti/react'
export default function Page() {
  return <h1>{t\`Hello\`}</h1>
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('async function Page()')
    expect(result.code).toContain('const __fluenti_get_i18n = async () => {')
  })

  it('auto-promotes sync arrow component to async when using imported t', () => {
    const code = `
import { t } from '@fluenti/react'
const Page = () => {
  return <h1>{t\`Hello\`}</h1>
}
export default Page
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_get_i18n = async () => {')
  })

  it('auto-promotes non-async generateMetadata to server-eligible', () => {
    const code = `
import { t } from '@fluenti/react'
export function generateMetadata() {
  return { title: t\`Page Title\`, description: t\`Page Description\` }
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('async function generateMetadata()')
    expect(result.code).toContain('const __fluenti_get_i18n = async () => {')
    expect(result.code).toContain("message: 'Page Title'")
    expect(result.code).toContain("message: 'Page Description'")
  })

  it('auto-promotes generateStaticParams to server-eligible', () => {
    const code = `
import { t } from '@fluenti/react'
export function generateStaticParams() {
  return [{ slug: t\`hello\` }]
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('async function generateStaticParams()')
  })

  it('keeps imported server t lookups ordered after locale setup', () => {
    const code = `
import { t } from '@fluenti/react'
import { setLocale } from '@fluenti/next'

export default async function Page({ searchParams }) {
  const params = await searchParams
  if (params.lang) {
    setLocale(params.lang)
  }
  return <h1>{t\`Hello\`}</h1>
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_get_i18n = async () => {')
    expect(result.code).toContain('if (__fluenti_get_i18n_cache === undefined)')
    expect(result.code).toContain("(await __fluenti_get_i18n()).t({ id:")
    expect(result.code.indexOf('setLocale(params.lang)')).toBeLessThan(result.code.indexOf("(await __fluenti_get_i18n()).t({ id:"))
    expect(result.code.match(/await getI18n\(\)/g)).toHaveLength(1)
  })

  it('reuses one lazily cached server i18n helper per async scope', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  return (
    <>
      <h1>{t\`Hello\`}</h1>
      <p>{t\`World\`}</p>
    </>
  )
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code.match(/const __fluenti_get_i18n = async \(\) =>/g)).toHaveLength(1)
    expect(result.code.match(/await getI18n\(\)/g)).toHaveLength(1)
    expect(result.code.match(/await __fluenti_get_i18n\(\)/g)).toHaveLength(2)
  })

  it('generates sync access for t`` inside .map() callback', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const items = ['a', 'b']
  return items.map(item => t\`Hello \${item}\`)
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    // Should generate eager resolve before the .map()
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
    // Should use sync access inside the callback
    expect(result.code).toContain('__fluenti_i18n.t({')
    // Should NOT contain await inside the .map() callback
    expect(result.code).not.toMatch(/items\.map\(item\s*=>\s*\(await/)
  })

  it('generates both await and sync access when mixing direct and nested t', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const title = t\`Title\`
  const items = ['a', 'b']
  return <div>
    <h1>{title}</h1>
    {items.map(item => <span>{t\`Hello \${item}\`}</span>)}
  </div>
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    // Direct usage keeps await pattern
    expect(result.code).toContain('(await __fluenti_get_i18n()).t(')
    // Nested usage gets sync access
    expect(result.code).toContain('__fluenti_i18n.t(')
    // Eager resolve is injected
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
  })

  it('places eager resolve after setLocale when both present', () => {
    const code = `
import { t } from '@fluenti/react'
import { setLocale } from '@fluenti/next'

export default async function Page({ searchParams }) {
  const params = await searchParams
  if (params.lang) {
    setLocale(params.lang)
  }
  return items.map(item => <div>{t\`Hello \${item}\`}</div>)
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    // Eager resolve should be after setLocale, before .map()
    const eagerIdx = result.code.indexOf('const __fluenti_i18n = await __fluenti_get_i18n()')
    const setLocaleIdx = result.code.indexOf('setLocale(params.lang)')
    const mapIdx = result.code.indexOf('items.map')
    expect(eagerIdx).toBeGreaterThan(setLocaleIdx)
    expect(eagerIdx).toBeLessThan(mapIdx)
  })

  it('handles nested .filter().map() chains with t in innermost callback', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const items = ['a', 'b', 'c']
  return items.filter(x => x !== 'b').map(item => t\`Item \${item}\`)
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
    expect(result.code).toContain('__fluenti_i18n.t({')
  })

  it('generates sync access for t() descriptor form inside callbacks', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const items = ['a', 'b']
  return items.map(item => t({ id: 'greeting', message: 'Hello' }))
}
`

    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
    expect(result.code).toContain('__fluenti_i18n.t({')
    expect(result.code).not.toMatch(/items\.map\(item\s*=>\s*\(await/)
  })

  it('throws a stable error when useI18n() is imported in a Next server file', () => {
    const code = `
import { useI18n } from '@fluenti/react'
export default async function Page() {
  const { t } = useI18n()
  return <h1>{t('Welcome')}</h1>
}
`

    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
      errorOnServerUseI18n: true,
    })).toThrow(
      "[fluenti] useI18n() is client-only in Next server files. " +
        "Use direct imports from '@fluenti/react' for authoring, or await getI18n() from '@fluenti/next' for runtime access.",
    )
  })

  // ─── classifyExpression edge cases ─────────────────────
  it('uses positional arg for bracket access expression', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const arr = [1]
const msg = t\`Value: \${arr[0]}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Value: {arg0}'")
  })

  it('classifies function call expressions — fn() → fn', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Result: \${getName()}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Result: {getName}'")
  })

  it('classifies dotted function call — obj.method() → obj_method', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Result: \${user.getName()}\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Result: {user_getName}'")
  })

  // ─── CatchClause scope ─────────────────────────────────
  it('does not transform t shadowed in catch clause', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Outer\`
try {
  throw new Error()
} catch (t) {
  const x = t
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Outer'")
    // The catch block 't' should not be transformed
  })

  // ─── Block scope ───────────────────────────────────────
  it('handles block-scoped variables', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\`
{
  const t = 'shadowed'
  console.log(t)
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("const t = 'shadowed'")
  })

  // ─── for/of/in scoping ────────────────────────────────
  it('handles for...of loop scope', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Before\`
for (const item of items) {
  console.log(item)
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── readStaticStringValue with template literal expressions ─
  it('rejects descriptor with template literal containing expressions', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ message: \`Hello \${name}\` })
}
`
    expect(() => scopeTransform(code, opts)).toThrow()
  })

  // ─── Vue allowTopLevelImportedT ────────────────────────
  it('transforms top-level imported t in Vue with allowTopLevelImportedT', () => {
    const code = `
import { t } from '@fluenti/vue'
const msg = t\`Hello\`
`
    const result = scopeTransform(code, { framework: 'vue', allowTopLevelImportedT: true })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── Server scope error for client binding ─────────────
  it('throws when server t used outside eligible scope in Vue', () => {
    const code = `
import { t } from '@fluenti/vue'
const label = t\`Hello\`
`
    expect(() => scopeTransform(code, { framework: 'vue' })).toThrow(
      /compile-time API/
    )
  })

  // ─── Descriptor with context property ──────────────────
  it('transforms descriptor call with context property', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ message: 'Hello', context: 'greeting' })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("context: 'greeting'")
  })

  // ─── getI18n (server) await pattern ────────────────────
  it('transforms t from await getI18n()', () => {
    const code = `
import { getI18n } from '@fluenti/next'
export default async function Page() {
  const { t } = await getI18n()
  return t\`Hello\`
}
`
    const result = scopeTransform(code, { framework: 'react' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── rerouteServerAuthoringImports ─────────────────────

  it('reroutes Trans/Plural imports from framework to server source', () => {
    const code = `
import { Trans, Plural } from '@fluenti/react'
export default async function Page() {
  return <Trans>Hello</Trans>
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("@fluenti/next")
  })

  it('throws on duplicate server authoring imports from both sources', () => {
    const code = `
import { Trans } from '@fluenti/react'
import { Trans } from '@fluenti/next'
export default async function Page() {
  return <Trans>Hello</Trans>
}
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })).toThrow('Conflicting imports')
  })

  // ─── expression body arrow function with server t ──────

  it('converts expression-body arrow to block when injecting server helper', () => {
    const code = `
import { t } from '@fluenti/react'
const Page = async () => t\`Hello\`
export default Page
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('return')
    expect(result.code).toContain('__fluenti_get_i18n')
  })

  // ─── SwitchStatement scope ────────────────────────────

  it('handles SwitchStatement as a scoping boundary', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Hello\`
switch (x) {
  case 1: {
    const t = 'shadowed'
    console.log(t)
    break
  }
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("const t = 'shadowed'")
  })

  // ─── ObjectMethod / ClassMethod name resolution ────────

  it('recognizes ObjectMethod named setup as Vue target', () => {
    const code = `
import { t } from '@fluenti/vue'
export default {
  setup() {
    return { msg: t\`Hello\` }
  }
}
`
    const result = scopeTransform(code, { framework: 'vue' })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── readImportedName StringLiteral branch ─────────────

  it('handles StringLiteral imported name in import specifier', () => {
    const code = `
import { 'useI18n' as useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── readStaticStringValue TemplateLiteral ─────────────

  it('supports TemplateLiteral without expressions in descriptor', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ message: \`Hello world\` })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello world'")
  })

  // ─── server scope error ────────────────────────────────

  it('throws when imported server t used outside eligible scope', () => {
    const code = `
import { t } from '@fluenti/next'
const label = t\`Hello\`
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
    })).toThrow(/must be used inside/)
  })

  // ─── Empty file / no imports ──────────────────────────
  it('returns untransformed for empty file', () => {
    const result = scopeTransform('', opts)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe('')
  })

  it('returns untransformed for file with only type imports', () => {
    const code = `
import type { SomeType } from '@fluenti/react'
const x = 5
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  // ─── Arrow function vs function declaration ──────────
  it('transforms t inside arrow function component', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const MyComponent = () => {
  const { t } = useI18n()
  return t\`Hello\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── Default exports vs named exports ─────────────────
  it('transforms t inside default exported function', () => {
    const code = `
import { useI18n } from '@fluenti/react'
export default function Page() {
  const { t } = useI18n()
  return t\`Welcome\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Welcome'")
  })

  // ─── Nested scope with arrow and function declaration ─
  it('handles nested functions — inner shadowing does not leak to outer', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Outer\`
const inner = () => {
  const t = 'local'
  return t
}
const after = t\`After\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Outer'")
    expect(result.code).toContain("message: 'After'")
    expect(result.code).toContain("const t = 'local'")
  })

  // ─── Descriptor with context + server ─────────────────
  it('transforms server descriptor call with context property', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return t({ message: 'Close', context: 'menu' })
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("context: 'menu'")
    expect(result.code).toContain("message: 'Close'")
  })

  // ─── Descriptor with second values argument ───────────
  it('transforms descriptor call with values argument', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ message: '{count} items', id: 'item.count' }, { count: 5 })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("id: 'item.count'")
    expect(result.code).toContain("message: '{count} items'")
  })

  // ─── Sync server descriptor inside callback ───────────
  it('generates sync access for descriptor t() inside callbacks in server component', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const items = ['a', 'b']
  return items.map(item => t({ message: 'Hello {item}' }, { item }))
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
    expect(result.code).toContain('__fluenti_i18n.t({')
  })

  // ─── Server descriptor with context ───────────────────
  it('transforms server descriptor with context in async function', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return t({ message: 'Open', context: 'button' })
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("context: 'button'")
  })

  // ─── Server descriptor with values argument ───────────
  it('transforms server descriptor with values argument in async function', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return t({ message: '{n} items' }, { n: 3 })
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: '{n} items'")
  })

  // ─── Empty descriptor ─────────────────────────────────
  it('throws on empty descriptor call (no arguments)', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t()
}
`
    expect(() => scopeTransform(code, opts)).toThrow(
      /only supports tagged templates and static descriptor calls/
    )
  })

  // ─── Non-static descriptor ────────────────────────────
  it('throws on non-object descriptor argument', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t(variable)
}
`
    expect(() => scopeTransform(code, opts)).toThrow(
      /only supports tagged templates and static descriptor calls/
    )
  })

  // ─── Descriptor without message ───────────────────────
  it('throws on descriptor without message property', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ id: 'only-id' })
}
`
    expect(() => scopeTransform(code, opts)).toThrow(
      /only supports tagged templates and static descriptor calls/
    )
  })

  // ─── Descriptor with computed property ────────────────
  it('throws on descriptor with computed property key', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ [key]: 'Hello' })
}
`
    expect(() => scopeTransform(code, opts)).toThrow(
      /only supports tagged templates and static descriptor calls/
    )
  })

  // ─── Descriptor with comment property (skipped) ───────
  it('transforms descriptor that has a comment property', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ message: 'Hello', comment: 'translator note' })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── createUniqueName collision ────────────────────────
  it('transforms when useI18n name collides with existing binding', () => {
    const code = `
import { t } from '@fluenti/react'
const useI18n = 'something'
const useI18n2 = 'something else'
export function Card() {
  return t\`Hello\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    // Should create a unique name that doesn't clash
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── Class method scope ───────────────────────────────
  it('resolves ClassMethod as a function target', () => {
    const code = `
import { t } from '@fluenti/react'
class MyComponent {
  Render() {
    return t\`Hello\`
  }
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── Non-identifier tag in tagged template ────────────
  it('ignores tagged templates with non-identifier tags', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = obj.t\`Hello\`
`
    const result = scopeTransform(code, opts)
    // Member expression tag should not be transformed
    expect(result.code).not.toContain("message: 'Hello'")
  })

  // ─── CallExpression with non-identifier callee ────────
  it('ignores call expressions with non-identifier callee', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = obj.t({ message: 'Hello' })
`
    const result = scopeTransform(code, opts)
    // obj.t() should not be intercepted
    expect(result.code).not.toContain("__id")
  })

  // ─── Template with cooked === null (escaped chars) ────
  it('falls back to raw value when cooked is null', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\\nWorld\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("t({ id:")
  })

  // ─── Server t throws for scope error (server kind) ────
  it('throws scope error for server t outside async/component scope', () => {
    const code = `
import { t } from '@fluenti/next'
function helper() {
  return t\`Hello\`
}
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
    })).toThrow(/must be used inside a React component/)
  })

  // ─── Vue scope error ──────────────────────────────────
  it('throws Vue-specific scope error for client t outside setup', () => {
    const code = `
import { t } from '@fluenti/vue'
function helper() {
  const label = t\`Hello\`
}
`
    expect(() => scopeTransform(code, { framework: 'vue' })).toThrow(
      /script setup.*or.*setup\(\)/
    )
  })

  // ─── ForInStatement scoping ───────────────────────────
  it('handles for...in loop scope', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Before\`
for (const key in obj) {
  console.log(key)
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── ForStatement scoping ────────────────────────────
  it('handles for loop scope', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Before\`
for (let i = 0; i < 10; i++) {
  console.log(i)
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── Destructuring with rest in useI18n result ────────
  it('handles destructuring with non-t properties from useI18n', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t, locale } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── FunctionDeclaration scope binding ────────────────
  it('collects function declarations as scope bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
function t() { return 42 }
const x = t\`Hello\`
`
    // t is shadowed by function declaration
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
  })

  // ─── ClassDeclaration scope binding ───────────────────
  it('collects class declarations as scope bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
class t {}
const x = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(false)
  })

  // ─── ArrayPattern destructuring ───────────────────────
  it('collects array pattern bindings as scope bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Before\`
function inner() {
  const [t] = [42]
  return t
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── RestElement in destructuring ─────────────────────
  it('collects rest element bindings as scope bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Before\`
function inner() {
  const { a, ...t } = { a: 1, b: 2 }
  return t
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── AssignmentPattern in destructuring ───────────────
  it('collects assignment pattern bindings as scope bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const outer = t\`Before\`
function inner({ t = 'default' }) {
  return t
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Before'")
  })

  // ─── CatchClause without param ────────────────────────
  it('handles catch clause without binding param', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
try {
  throw new Error()
} catch {
  console.log('error')
}
const msg = t\`After\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'After'")
  })

  // ─── Server empty descriptor call ─────────────────────
  it('throws on empty server descriptor call', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return t()
}
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })).toThrow(/only supports tagged templates and static descriptor calls/)
  })

  // ─── Server non-static descriptor ─────────────────────
  it('throws on non-static server descriptor', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return t(dynamicVar)
}
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })).toThrow(/only supports tagged templates and static descriptor calls/)
  })

  // ─── Sync server empty descriptor call ────────────────
  it('throws on empty sync server descriptor call in callback', () => {
    const code = `
import { t } from '@fluenti/react'
export default async function Page() {
  return items.map(x => t())
}
`
    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })).toThrow(/only supports tagged templates and static descriptor calls/)
  })

  // ─── Server sync descriptor with context and values ───
  it('transforms sync server descriptor with context and values in callback', () => {
    const code = `
import { t } from '@fluenti/react'

export default async function Page() {
  const items = ['a', 'b']
  return items.map(item => t({ message: 'Hello {item}', context: 'card' }, { item }))
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("context: 'card'")
    expect(result.code).toContain('__fluenti_i18n.t({')
  })

  // ─── Client t with needsClientImport ──────────────────
  it('injects useI18n import when not already imported', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t\`Hello\`
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── PropertyKey as StringLiteral in descriptor ───────
  it('handles StringLiteral property key in descriptor', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ 'message': 'Hello' })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── server authoring imports only (no t usage) ───────
  it('reroutes server authoring imports even without t usage', () => {
    const code = `
import { Trans, Plural, Select } from '@fluenti/react'
export default async function Page() {
  return <Trans>Hello</Trans>
}
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("@fluenti/next")
  })

  // ─── Descriptor with id property ──────────────────────
  it('transforms descriptor with explicit id', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ id: 'my.custom.id', message: 'Hello' })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("id: 'my.custom.id'")
  })

  // ─── t with default value in destructuring ────────────
  it('handles t with default value in destructuring (AssignmentPattern)', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t = fallback } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })

  // ─── Expression-body arrow with server t in callback ──
  it('converts expression-body arrow to block with eager resolve for nested callbacks', () => {
    const code = `
import { t } from '@fluenti/react'
const Page = async () => items.map(x => t\`Hello \${x}\`)
export default Page
`
    const result = scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain('const __fluenti_i18n = await __fluenti_get_i18n()')
    expect(result.code).toContain('__fluenti_i18n.t({')
    expect(result.code).toContain('return')
  })

  // ─── Top-level array destructuring for program bindings ─
  it('collects top-level array destructuring bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const [t] = [useI18n().t]
const x = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    // t is from array destructuring, not from useI18n() pattern
    expect(result.transformed).toBe(false)
  })

  // ─── Top-level rest element in object destructuring ───
  it('collects top-level rest element in object destructuring', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { a, ...t } = { a: 1, t: useI18n().t }
const x = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    // t is from rest element, not tracked useI18n pattern
    expect(result.transformed).toBe(false)
  })

  // ─── Top-level assignment pattern ─────────────────────
  it('collects top-level assignment pattern bindings', () => {
    const code = `
import { useI18n } from '@fluenti/react'
const { t = 'default' } = {}
const x = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    // t is from assignment pattern, not tracked useI18n
    expect(result.transformed).toBe(false)
  })

  // ─── Vue top-level with server authoring reroute + t ──
  it('transforms Vue allowTopLevelImportedT with expressions', () => {
    const code = `
import { t } from '@fluenti/vue'
const name = 'World'
const msg = t\`Hello \${name}\`
`
    const result = scopeTransform(code, { framework: 'vue', allowTopLevelImportedT: true })
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello {name}'")
  })

  // ─── readImportedName with non-identifier, non-string ──
  it('handles import specifier with neither identifier nor string literal', () => {
    // This tests a defensive path; in practice Babel always produces one of these
    const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const msg = t\`Hello\`
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
  })

  // ─── readPropertyKey with StringLiteral ───────────────
  it('handles descriptor with StringLiteral property keys', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ 'message': 'Hello', 'context': 'card' })
}
`
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
    expect(result.code).toContain("context: 'card'")
  })

  // ─── SpreadElement in descriptor ──────────────────────
  it('ignores spread elements in descriptor object', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t({ ...base, message: 'Hello' })
}
`
    // SpreadElement is not ObjectProperty, should be skipped
    const result = scopeTransform(code, opts)
    expect(result.transformed).toBe(true)
    expect(result.code).toContain("message: 'Hello'")
  })
})

// ─── Direct unit tests for scope-read helpers ──────────
describe('readImportedName', () => {
  it('returns undefined for unknown node types', () => {
    const specifier = {
      type: 'ImportSpecifier',
      imported: { type: 'NumericLiteral', value: 42 } as unknown as SourceNode,
      local: { type: 'Identifier', name: 'x' } as SourceNode,
    } as never
    expect(readImportedName(specifier)).toBeUndefined()
  })
})

describe('readPropertyKey', () => {
  it('returns undefined for non-identifier, non-string node', () => {
    const node = { type: 'NumericLiteral', value: 42 } as unknown as SourceNode
    expect(readPropertyKey(node)).toBeUndefined()
  })
})

describe('readStaticStringValue', () => {
  it('returns undefined for non-string, non-template node', () => {
    const node = { type: 'NumericLiteral', value: 42 } as unknown as SourceNode
    expect(readStaticStringValue(node)).toBeUndefined()
  })

  it('returns undefined for template literal with expressions', () => {
    const node = {
      type: 'TemplateLiteral',
      quasis: [
        { value: { cooked: 'Hello ', raw: 'Hello ' } },
        { value: { cooked: '', raw: '' } },
      ],
      expressions: [{ type: 'Identifier', name: 'x' }],
    } as unknown as SourceNode
    expect(readStaticStringValue(node)).toBeUndefined()
  })
})
