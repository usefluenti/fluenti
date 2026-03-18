import { describe, it, expect } from 'vitest'
import { scopeTransform } from '../src/scope-transform'

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
    expect(result.code).toContain("message: 'Result: {0}' }, { 0: 1 + 2 })")
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

  it('throws a stable error for unsupported imported t() runtime lookups', () => {
    const code = `
import { t } from '@fluenti/react'
export function Card() {
  return t('nav.home')
}
`

    expect(() => scopeTransform(code, opts)).toThrow(
      '[fluenti] Imported `t` only supports tagged templates and static descriptor calls. ' +
        'Use useI18n().t(...) or await getI18n() for runtime lookups.',
    )
  })

  it('throws a stable error for unsupported direct-import client scopes', () => {
    const code = `
import { t } from '@fluenti/react'
const label = t\`Hello\`
`

    expect(() => scopeTransform(code, opts)).toThrow(
      "[fluenti] Imported `t` from '@fluenti/react' is a compile-time API. " +
        'Use it only inside a component or custom hook.',
    )
  })

  it('throws a stable error for imported t in sync server scopes', () => {
    const code = `
import { t } from '@fluenti/react'
export default function Page() {
  return <h1>{t\`Hello\`}</h1>
}
`

    expect(() => scopeTransform(code, {
      framework: 'react',
      serverModuleImport: '@fluenti/next/__generated',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })).toThrow(
      "[fluenti] Imported `t` from '@fluenti/react' requires an async server scope. " +
        'Make the current component/action/handler async, or use await getI18n().',
    )
  })

  it('keeps imported server t lookups ordered after locale setup', () => {
    const code = `
import { t } from '@fluenti/react'
import { setLocale } from '@fluenti/next/__generated'

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
      serverModuleImport: '@fluenti/next/__generated',
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
      serverModuleImport: '@fluenti/next/__generated',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
    })

    expect(result.transformed).toBe(true)
    expect(result.code.match(/const __fluenti_get_i18n = async \(\) =>/g)).toHaveLength(1)
    expect(result.code.match(/await getI18n\(\)/g)).toHaveLength(1)
    expect(result.code.match(/await __fluenti_get_i18n\(\)/g)).toHaveLength(2)
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
      serverModuleImport: '@fluenti/next/__generated',
      treatFrameworkDirectImportsAsServer: true,
      rerouteServerAuthoringImports: true,
      errorOnServerUseI18n: true,
    })).toThrow(
      "[fluenti] useI18n() is client-only in Next server files. " +
        "Use direct imports from '@fluenti/react' for authoring, or await getI18n() from '@fluenti/next/__generated' for runtime access.",
    )
  })
})
