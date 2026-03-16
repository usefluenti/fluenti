import { describe, it, expect } from 'vitest'
import { transform, transformTaggedTemplate, injectImport } from '../src/transform'

describe('transformTaggedTemplate', () => {
  it('transforms plain tagged template', () => {
    const result = transformTaggedTemplate('const msg = t`Hello World`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello World')")
  })

  it('transforms tagged template with variable', () => {
    const result = transformTaggedTemplate('const msg = t`Hello ${name}`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello {name}', { name: name })")
  })

  it('transforms tagged template with property access', () => {
    const result = transformTaggedTemplate('const msg = t`Hello ${user.name}`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello {name}', { name: user.name })")
  })

  it('transforms tagged template with complex expression (positional)', () => {
    const result = transformTaggedTemplate('const msg = t`Result: ${a + b}`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Result: {0}', { 0: a + b })")
  })

  it('transforms tagged template with multiple variables', () => {
    const result = transformTaggedTemplate('const msg = t`${greeting} ${name}!`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('{greeting} {name}!', { greeting: greeting, name: name })")
  })

  it('transforms t() function call', () => {
    const result = transformTaggedTemplate("const msg = t('Hello World')")
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello World')")
  })

  it('transforms t() with values', () => {
    const result = transformTaggedTemplate("const msg = t('Hello {name}', { name })")
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello {name}', { name })")
  })

  it('does not transform .t() or $t()', () => {
    const result = transformTaggedTemplate("const msg = i18n.t('Hello')")
    expect(result.needsImport).toBe(false)
    expect(result.code).toBe("const msg = i18n.t('Hello')")
  })

  it('returns needsImport=false for no transforms', () => {
    const result = transformTaggedTemplate('const x = 42')
    expect(result.needsImport).toBe(false)
    expect(result.code).toBe('const x = 42')
  })
})

describe('injectImport', () => {
  it('injects __useI18n import from @fluenti/react', () => {
    const result = injectImport('const x = 1')
    expect(result).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result).toContain('const __i18n = __useI18n()')
    expect(result).toContain('const x = 1')
  })
})

describe('transform', () => {
  it('transforms tsx file with t``', () => {
    const result = transform('const msg = t`Hello`', 'App.tsx')
    expect(result).not.toBeNull()
    expect(result!.transformed).toBe(true)
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result!.code).toContain("__i18n.t('Hello')")
  })

  it('transforms ts file with t()', () => {
    const result = transform("const msg = t('Hello')", 'utils.ts')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("__i18n.t('Hello')")
  })

  it('skips node_modules', () => {
    const result = transform('const msg = t`Hello`', 'node_modules/pkg/index.tsx')
    expect(result).toBeNull()
  })

  it('skips non-JS files', () => {
    const result = transform('const msg = t`Hello`', 'styles.css')
    expect(result).toBeNull()
  })

  it('skips files without t`` or t()', () => {
    const result = transform('const x = 42', 'App.tsx')
    expect(result).toBeNull()
  })
})
