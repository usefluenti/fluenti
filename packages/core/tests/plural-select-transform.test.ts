import { describe, expect, it } from 'vitest'
import { transformPluralSelectComponents } from '../src/transform'

describe('transformPluralSelectComponents', () => {
  it('rewrites React <Plural> with static string forms to the compiled component', () => {
    const code = `
import { Plural } from '@fluenti/react'

export function Cart({ count }: { count: number }) {
  return <Plural value={count} one="# item" other="# items" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'react',
      componentModuleImport: '@fluenti/react/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain("import { __FluentiCompiledPlural } from '@fluenti/react/components'")
    expect(result.code).toContain('<__FluentiCompiledPlural')
    expect(result.code).toContain('message={"{count, plural, one {# item} other {# items}}"}')
    expect(result.code).not.toContain('one="# item"')
    expect(result.code).not.toContain('other="# items"')
  })

  it('inserts compiled imports on a separate line for semicolon-free files', () => {
    const code = `
import { Plural } from '@fluenti/react/components'

export function Cart({ count }: { count: number }) {
  return <Plural value={count} one="# item" other="# items" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'react',
      componentModuleImport: '@fluenti/react/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain("import { Plural } from '@fluenti/react/components'\nimport { __FluentiCompiledPlural } from '@fluenti/react/components'")
  })

  it('rewrites Solid <Select> options object literals to the compiled component', () => {
    const code = `
import { Select } from '@fluenti/solid'

export function Role(props: { role: string }) {
  return <Select value={props.role} options={{ admin: 'Full access', editor: 'Can edit' }} other="Unknown" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'solid',
      componentModuleImport: '@fluenti/solid/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain("import { __FluentiCompiledSelect } from '@fluenti/solid/components'")
    expect(result.code).toContain('<__FluentiCompiledSelect')
    expect(result.code).toContain('message={"{value, select, admin {Full access} editor {Can edit} other {Unknown}}"}')
    expect(result.code).toContain('valueMap={{"admin":"admin","editor":"editor"}}')
    expect(result.code).not.toContain('options={{')
  })

  it('preserves dynamic context when compiling plain-text forms', () => {
    const code = `
import { Plural } from '@fluenti/react/components'

export function Cart({ count, context }: { count: number; context: string }) {
  return <Plural value={count} context={context} one="# item" other="# items" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'react',
      componentModuleImport: '@fluenti/react/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain('context={context}')
    expect(result.code).toContain('message={"{count, plural, one {# item} other {# items}}"}')
  })

  it('rewrites React <Plural> with static rich JSX forms to the compiled rich component', () => {
    const code = `
import { Plural } from '@fluenti/react'

export function Cart({ count }: { count: number }) {
  return <Plural value={count} one={<><strong>#</strong> item</>} other={<><strong>#</strong> items</>} />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'react',
      componentModuleImport: '@fluenti/react/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain("import { __FluentiCompiledRichPlural } from '@fluenti/react/components'")
    expect(result.code).toContain('<__FluentiCompiledRichPlural')
    expect(result.code).toContain('message={"{count, plural, one {<0>#</0> item} other {<1>#</1> items}}"}')
    expect(result.code).toContain('components={[<strong />, <strong />]}')
    expect(result.code).not.toContain('one={<><strong>#</strong> item</>}')
  })

  it('rewrites Solid <Select> rich options object literals to the compiled rich component', () => {
    const code = `
import { Select } from '@fluenti/solid'

export function Access(props: { role: string }) {
  return <Select value={props.role} options={{ admin: <><strong>Admin</strong> access</>, editor: 'Can edit' }} other={<em>Guest</em>} />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'solid',
      componentModuleImport: '@fluenti/solid/components',
    })

    expect(result.transformed).toBe(true)
    expect(result.code).toContain("import { __FluentiCompiledRichSelect } from '@fluenti/solid/components'")
    expect(result.code).toContain('<__FluentiCompiledRichSelect')
    expect(result.code).toContain('message={"{value, select, admin {<0>Admin</0> access} editor {Can edit} other {<1>Guest</1>}}"}')
    expect(result.code).toContain('components={[<strong />, <em />]}')
  })

  it('skips dynamic options objects that cannot be proven at build time', () => {
    const code = `
import { Select } from '@fluenti/solid'

export function Access(props: { role: string; options: Record<string, string> }) {
  return <Select value={props.role} options={props.options} other="Guest" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'solid',
      componentModuleImport: '@fluenti/solid/components',
    })

    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })

  it('skips rich JSX forms with dynamic expressions that still need the full runtime', () => {
    const code = `
import { Select } from '@fluenti/react'

export function Access({ role, label }: { role: string; label: string }) {
  return <Select value={role} admin={<b>{label}</b>} other="Guest" />
}
`

    const result = transformPluralSelectComponents(code, {
      framework: 'react',
      componentModuleImport: '@fluenti/react/components',
    })

    expect(result.transformed).toBe(false)
    expect(result.code).toBe(code)
  })
})
