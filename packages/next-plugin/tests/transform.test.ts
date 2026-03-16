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

  // --- Edge case tests ---

  it('transforms t`Hello` basic literal with no interpolation', () => {
    const { code, needsImport } = transformTaggedTemplate('t`Hello`')
    expect(code).toBe("__i18n.t('Hello')")
    expect(needsImport).toBe(true)
  })

  it('transforms t`Hello ${name}` expression interpolation', () => {
    const { code } = transformTaggedTemplate('t`Hello ${name}`')
    expect(code).toBe("__i18n.t('Hello {name}', { name: name })")
  })

  it('transforms t`${user.name}` property access as sole interpolation', () => {
    const { code } = transformTaggedTemplate('t`${user.name}`')
    expect(code).toBe("__i18n.t('{name}', { name: user.name })")
  })

  it('transforms t`${fn()}` complex expression with function call', () => {
    const { code } = transformTaggedTemplate('t`${fn()}`')
    expect(code).toBe("__i18n.t('{0}', { 0: fn() })")
  })

  it('transforms standalone t(\'msg\') call', () => {
    const { code, needsImport } = transformTaggedTemplate("t('msg')")
    expect(code).toBe("__i18n.t('msg')")
    expect(needsImport).toBe(true)
  })

  it('transforms t(\'msg\', values) with values argument', () => {
    const { code } = transformTaggedTemplate("t('msg', { count: 5 })")
    expect(code).toBe("__i18n.t('msg', { count: 5 })")
  })

  it('does not transform .t() method calls on objects', () => {
    const input = "obj.t('hello')"
    const { code, needsImport } = transformTaggedTemplate(input)
    expect(code).toBe(input)
    expect(needsImport).toBe(false)
  })

  it('does not transform $t() vue-style calls', () => {
    const input = "this.$t('hello')"
    const { code, needsImport } = transformTaggedTemplate(input)
    expect(code).toBe(input)
    expect(needsImport).toBe(false)
  })

  it('returns original code unchanged when no fluent pattern exists', () => {
    const input = 'const greeting = "Hello world"\nconsole.log(greeting)'
    const { code, needsImport } = transformTaggedTemplate(input)
    expect(code).toBe(input)
    expect(needsImport).toBe(false)
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

  // --- Edge case tests ---

  it('detects "use client" directive with double quotes', () => {
    expect(detectInjectionMode('"use client"\nconst x = 1', '/project/lib/hook.ts')).toBe('client')
  })

  it('detects "use server" directive with double quotes', () => {
    expect(detectInjectionMode('"use server"\nconst x = 1', '/project/app/actions.ts')).toBe('server')
  })

  it('detects app/ directory deeply nested path as server', () => {
    expect(detectInjectionMode('const x = 1', '/project/src/app/dashboard/settings/page.tsx')).toBe('server')
  })

  it('detects pages/ directory deeply nested path as client', () => {
    expect(detectInjectionMode('const x = 1', '/project/src/pages/auth/login.tsx')).toBe('client')
  })

  it('defaults to client for lib/ directory files', () => {
    expect(detectInjectionMode('const x = 1', '/project/lib/utils.ts')).toBe('client')
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

  // --- Edge case tests ---

  it('injects server import with Proxy-based deferred accessor', () => {
    const result = injectI18nImport('const x = 1', 'server', '@fluenti/next/__generated')
    expect(result).toContain("import { __getServerI18n as __getI18nAccessor } from '@fluenti/next/__generated'")
    expect(result).toContain('new Proxy({}, { get: (_, p) => __getI18nAccessor()[p] })')
  })

  it('injects client mode with globalThis-based Proxy', () => {
    const result = injectI18nImport('const x = 1', 'client', '@fluenti/next/__generated')
    expect(result).toContain('new Proxy({}, { get: (_, p) => globalThis.__fluenti_i18n[p] })')
    expect(result).not.toContain('import')
  })

  it('preserves use client directive at the beginning', () => {
    const result = injectI18nImport("'use client';\nconst x = 1", 'client', '@fluenti/next/__generated')
    expect(result.startsWith("'use client'")).toBe(true)
    const lines = result.split('\n')
    // 'use client' should be the very first content
    expect(lines[0]).toContain("'use client'")
  })

  it('preserves use server directive at the beginning', () => {
    const result = injectI18nImport("'use server'\nconst x = 1", 'server', '@fluenti/next/__generated')
    expect(result.startsWith("'use server'")).toBe(true)
    expect(result).toContain("import { __getServerI18n as __getI18nAccessor }")
    // Import should come after the directive
    const serverIdx = result.indexOf("'use server'")
    const importIdx = result.indexOf('import {')
    expect(importIdx).toBeGreaterThan(serverIdx)
  })

  it('prepends injection when no directive is present', () => {
    const result = injectI18nImport('const x = 1', 'server', '@fluenti/next/__generated')
    // Injection should be at the very start
    expect(result.startsWith('import {')).toBe(true)
  })
})

describe('classifyExpression (via transformTaggedTemplate)', () => {
  it('classifies simple identifier and uses it as key', () => {
    const { code } = transformTaggedTemplate('t`${count}`')
    expect(code).toBe("__i18n.t('{count}', { count: count })")
  })

  it('classifies dot path and uses last segment as key', () => {
    const { code } = transformTaggedTemplate('t`${obj.deeply.nested.value}`')
    expect(code).toBe("__i18n.t('{value}', { value: obj.deeply.nested.value })")
  })

  it('classifies complex expression as positional index', () => {
    const { code } = transformTaggedTemplate('t`${arr[0]}`')
    expect(code).toBe("__i18n.t('{0}', { 0: arr[0] })")
  })
})
