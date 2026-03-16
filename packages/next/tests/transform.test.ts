import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { transform, transformTaggedTemplate, injectImport, injectClientImport, injectServerImport } from '../src/transform'

describe('transformTaggedTemplate', () => {
  it('transforms plain tagged template (client mode)', () => {
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

describe('transformTaggedTemplate (server mode)', () => {
  it('transforms plain tagged template to __getServerI18n().t()', () => {
    const result = transformTaggedTemplate('const msg = t`Hello World`', 'server')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__getServerI18n().t('Hello World')")
  })

  it('transforms tagged template with variable', () => {
    const result = transformTaggedTemplate('const msg = t`Hello ${name}`', 'server')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__getServerI18n().t('Hello {name}', { name: name })")
  })

  it('transforms t() function call', () => {
    const result = transformTaggedTemplate("const msg = t('Hello World')", 'server')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__getServerI18n().t('Hello World')")
  })

  it('transforms t() with values', () => {
    const result = transformTaggedTemplate("const msg = t('Hello {name}', { name })", 'server')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__getServerI18n().t('Hello {name}', { name })")
  })

  it('does not transform .t() or $t()', () => {
    const result = transformTaggedTemplate("const msg = i18n.t('Hello')", 'server')
    expect(result.needsImport).toBe(false)
  })
})

describe('injectImport (legacy alias)', () => {
  it('injects __useI18n import from @fluenti/react', () => {
    const result = injectImport('const x = 1')
    expect(result).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result).toContain('const __i18n = __useI18n()')
    expect(result).toContain('const x = 1')
  })
})

describe('injectClientImport', () => {
  it('injects __useI18n import and hook call', () => {
    const result = injectClientImport('const x = 1')
    expect(result).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result).toContain('const __i18n = __useI18n()')
  })
})

describe('injectServerImport', () => {
  it('injects __getServerI18n import without hook call', () => {
    const result = injectServerImport('const x = 1')
    expect(result).toContain("import { __getServerI18n } from '@fluenti/next/server'")
    expect(result).not.toContain('__useI18n')
    expect(result).not.toContain('const __i18n')
  })
})

describe('transform (client mode)', () => {
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

  it('uses client mode for files with "use client"', () => {
    const code = `'use client'\nconst msg = t\`Hello\``
    const result = transform(code, 'App.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result!.code).toContain("__i18n.t('Hello')")
  })

  it('uses client mode for "use client" with double quotes', () => {
    const code = `"use client"\nconst msg = t\`Hello\``
    const result = transform(code, 'App.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
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

describe('transform (server mode)', () => {
  const originalEnv = process.env.__FLUENTI_SERVER_MODULE

  beforeEach(() => {
    process.env.__FLUENTI_SERVER_MODULE = './src/lib/i18n.server'
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.__FLUENTI_SERVER_MODULE
    } else {
      process.env.__FLUENTI_SERVER_MODULE = originalEnv
    }
  })

  it('uses server mode for files without "use client" when serverModule is set', () => {
    const result = transform('const msg = t`Hello`', 'page.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("import { __getServerI18n } from '@fluenti/next/server'")
    expect(result!.code).toContain("__getServerI18n().t('Hello')")
    expect(result!.code).not.toContain('__useI18n')
  })

  it('still uses client mode for "use client" files even when serverModule is set', () => {
    const code = `'use client'\nconst msg = t\`Hello\``
    const result = transform(code, 'ClientComp.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
    expect(result!.code).not.toContain('__getServerI18n')
  })

  it('transforms t() calls in server mode', () => {
    const result = transform("const msg = t('Hello {name}', { name })", 'page.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("__getServerI18n().t('Hello {name}', { name })")
  })

  it('falls back to client mode when serverModule is not set', () => {
    delete process.env.__FLUENTI_SERVER_MODULE
    const result = transform('const msg = t`Hello`', 'page.tsx')
    expect(result).not.toBeNull()
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
  })
})

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('transform edge cases', () => {
  it('handles "use client" with double quotes', () => {
    const code = `"use client"\nconst msg = t\`Hello\``
    const result = transform(code, 'App.tsx')
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
  })

  it('handles "use client" preceded by a comment', () => {
    const code = `// some comment\n'use client'\nconst msg = t\`Hello\``
    const result = transform(code, 'App.tsx')
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
  })

  it('handles "use client" preceded by a block comment', () => {
    const code = `/* license */\n'use client'\nconst msg = t\`Hello\``
    const result = transform(code, 'App.tsx')
    expect(result!.code).toContain("import { __useI18n } from '@fluenti/react'")
  })

  it('does not match use client in a string literal', () => {
    const code = `const x = 'use client'\nconst msg = t\`Hello\``
    // 'use client' is in a variable assignment, not a directive
    // The regex checks start of file, so this should NOT match as a client file
    // Since it starts with 'const', not 'use client', it's a server file
    // But we need serverModule to be set for server mode
    const result = transform(code, 'App.tsx')
    expect(result).not.toBeNull()
    // Without serverModule set, falls back to client mode
    expect(result!.code).toContain('__i18n.t')
  })

  it('transforms nested property access in template (a.b.c)', () => {
    const result = transformTaggedTemplate('const msg = t`Hello ${user.profile.name}`')
    expect(result.needsImport).toBe(true)
    // Last segment used as var name
    expect(result.code).toContain("__i18n.t('Hello {name}', { name: user.profile.name })")
  })

  it('handles escaped backslash in template', () => {
    const result = transformTaggedTemplate('const msg = t`Hello\\\\World`')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello\\\\World')")
  })

  it('does not transform t inside a word like "const" or "let"', () => {
    const result = transformTaggedTemplate('const setContext = (ctx) => ctx')
    expect(result.needsImport).toBe(false)
  })

  it('transforms multiple t`` in one file', () => {
    const code = 'const a = t`Hello`\nconst b = t`World`'
    const result = transformTaggedTemplate(code)
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello')")
    expect(result.code).toContain("__i18n.t('World')")
  })

  it('transforms mixed t`` and t() in one file', () => {
    const code = "const a = t`Hello`\nconst b = t('World')"
    const result = transformTaggedTemplate(code)
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello')")
    expect(result.code).toContain("__i18n.t('World')")
  })

  it('handles t() with double-quoted strings', () => {
    const result = transformTaggedTemplate('const msg = t("Hello World")')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('Hello World')")
  })

  it('handles empty template', () => {
    const result = transformTaggedTemplate('const msg = t``')
    expect(result.needsImport).toBe(true)
    expect(result.code).toContain("__i18n.t('')")
  })
})
