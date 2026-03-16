import { describe, it, expect } from 'vitest'
import { transformTaggedTemplate, detectInjectionMode, injectI18nImport } from '../src/transform'

describe('transformTaggedTemplate', () => {
  it('transforms simple tagged template', () => {
    const { code, needsImport } = transformTaggedTemplate('const x = t`Hello`')
    expect(code).toBe("const x = __i18n.t('Hello')")
    expect(needsImport).toBe(true)
  })

  it('transforms tagged template with variable', () => {
    const { code } = transformTaggedTemplate('const x = t`Hello ${name}`')
    expect(code).toBe("const x = __i18n.t('Hello {name}', { name: name })")
  })

  it('transforms tagged template with dotted path', () => {
    const { code } = transformTaggedTemplate('const x = t`Hello ${user.name}`')
    expect(code).toBe("const x = __i18n.t('Hello {name}', { name: user.name })")
  })

  it('transforms tagged template with complex expression', () => {
    const { code } = transformTaggedTemplate('const x = t`Total: ${a + b}`')
    expect(code).toBe("const x = __i18n.t('Total: {0}', { 0: a + b })")
  })

  it('transforms multiple tagged templates', () => {
    const input = 'const a = t`Hello`\nconst b = t`World`'
    const { code } = transformTaggedTemplate(input)
    expect(code).toContain("__i18n.t('Hello')")
    expect(code).toContain("__i18n.t('World')")
  })

  it('transforms standalone t() calls', () => {
    const { code, needsImport } = transformTaggedTemplate("const x = t('Hello')")
    expect(code).toBe("const x = __i18n.t('Hello')")
    expect(needsImport).toBe(true)
  })

  it('transforms t() with values', () => {
    const { code } = transformTaggedTemplate("const x = t('Hello {name}', { name })")
    expect(code).toBe("const x = __i18n.t('Hello {name}', { name })")
  })

  it('does not transform .t() method calls', () => {
    const input = "const x = i18n.t('Hello')"
    const { code, needsImport } = transformTaggedTemplate(input)
    expect(code).toBe(input)
    expect(needsImport).toBe(false)
  })

  it('does not transform $t() calls', () => {
    const input = "const x = $t('Hello')"
    const { code, needsImport } = transformTaggedTemplate(input)
    expect(code).toBe(input)
    expect(needsImport).toBe(false)
  })

  it('returns needsImport=false when no patterns found', () => {
    const { code, needsImport } = transformTaggedTemplate('const x = 42')
    expect(code).toBe('const x = 42')
    expect(needsImport).toBe(false)
  })

  it('handles escaped backticks in tagged template', () => {
    const { code } = transformTaggedTemplate('const x = t`Hello \\`world\\``')
    expect(code).toContain("__i18n.t('Hello \\`world\\`')")
  })

  it('transforms double-quoted t() calls', () => {
    const { code } = transformTaggedTemplate('const x = t("Hello")')
    expect(code).toBe('const x = __i18n.t(\'Hello\')')
  })
})

describe('detectInjectionMode', () => {
  it('detects "use client" as client mode', () => {
    expect(detectInjectionMode("'use client'\nconst x = 1", '/app/page.tsx')).toBe('client')
  })

  it('detects "use server" as server mode', () => {
    expect(detectInjectionMode("'use server'\nconst x = 1", '/app/actions.ts')).toBe('server')
  })

  it('detects app/ directory as server by default', () => {
    expect(detectInjectionMode('const x = 1', '/project/app/page.tsx')).toBe('server')
    expect(detectInjectionMode('const x = 1', '/project/src/app/page.tsx')).toBe('server')
  })

  it('detects pages/ directory as client', () => {
    expect(detectInjectionMode('const x = 1', '/project/pages/index.tsx')).toBe('client')
    expect(detectInjectionMode('const x = 1', '/project/src/pages/index.tsx')).toBe('client')
  })

  it('defaults to client for unknown paths', () => {
    expect(detectInjectionMode('const x = 1', '/project/components/Button.tsx')).toBe('client')
  })

  it('prioritizes use client over app/ directory', () => {
    expect(detectInjectionMode("'use client'\nconst x = 1", '/project/app/page.tsx')).toBe('client')
  })
})

describe('injectI18nImport', () => {
  it('injects server import for server mode', () => {
    const result = injectI18nImport('const x = 1', 'server', '@fluenti/next/__generated')
    expect(result).toContain("import { __getServerI18n as __getI18nAccessor } from '@fluenti/next/__generated'")
    expect(result).toContain('Proxy')
    expect(result).toContain('__getI18nAccessor()')
    expect(result).toContain('const x = 1')
  })

  it('injects client globalThis accessor for client mode', () => {
    const result = injectI18nImport('const x = 1', 'client', '@fluenti/next/__generated')
    expect(result).toContain('globalThis.__fluenti_i18n')
    expect(result).toContain('Proxy')
    expect(result).not.toContain("import { __useI18n }")
    expect(result).toContain('const x = 1')
  })

  it('injects after use client directive', () => {
    const result = injectI18nImport("'use client'\nconst x = 1", 'client', '@fluenti/next/__generated')
    expect(result.indexOf("'use client'")).toBe(0)
    expect(result.indexOf('globalThis')).toBeGreaterThan(result.indexOf("'use client'"))
  })
})
