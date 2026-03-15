import { describe, it, expect } from 'vitest'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from '../src/build-transform'

/**
 * FNV-1a hash — identical to @fluenti/cli hash.ts and build-transform.ts.
 * Duplicated here to verify cross-package hash consistency without adding a dependency.
 */
function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

describe('transformForDynamicSplit', () => {
  it('transforms $t calls to __catalog._hash references', () => {
    const code = `const text = $t('Hello world')`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain('__catalog._')
    expect(result.code).not.toContain("$t('Hello world')")
  })

  it('transforms $t with values to __catalog._hash(values)', () => {
    const code = `const text = $t('Hello {name}', { name })`
    const result = transformForDynamicSplit(code)

    expect(result.code).toMatch(/__catalog\._\w+\(\{ name \}\)/)
  })

  it('collects used hashes', () => {
    const code = `$t('a'); $t('b')`
    const result = transformForDynamicSplit(code)

    expect(result.usedHashes.size).toBe(2)
  })

  it('returns false for needsCatalogImport when no $t calls', () => {
    const code = `const x = 1`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(false)
    expect(result.code).toBe(code)
  })

  it('handles _ctx.$t() pattern from Vue compiled templates', () => {
    const code = `_toDisplayString(_ctx.$t('Hello world'))`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain('__catalog._')
    // _ctx. prefix should be removed — __catalog is a module-level import
    expect(result.code).not.toContain('_ctx.__catalog')
    expect(result.code).toMatch(/_toDisplayString\(__catalog\._\w+\)/)
  })

  it('handles _ctx.$t() with values', () => {
    const code = `_toDisplayString(_ctx.$t('Hello {name}', { name }))`
    const result = transformForDynamicSplit(code)

    expect(result.code).toMatch(/_toDisplayString\(__catalog\._\w+\(\{ name \}\)\)/)
  })

  it('handles $setup.$t() pattern', () => {
    const code = `_toDisplayString($setup.$t('Hello'))`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain('__catalog._')
    expect(result.code).not.toContain('$setup.__catalog')
  })

  it('handles backtick-quoted $t() from Vue 3 compiled templates', () => {
    const code = '_toDisplayString(_ctx.$t(`Hello world`))'
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain('__catalog._')
    expect(result.code).not.toContain('$t(')
  })

  it('handles double-quoted $t() calls', () => {
    const code = 'const text = $t("Hello world")'
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain('__catalog._')
  })
})

describe('transformForStaticSplit', () => {
  it('transforms $t calls to direct _hash references', () => {
    const code = `const text = $t('Hello world')`
    const result = transformForStaticSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toMatch(/const text = _\w+/)
    expect(result.code).not.toContain('__catalog')
  })

  it('transforms $t with values to _hash(values)', () => {
    const code = `const text = $t('Hello {name}', { name })`
    const result = transformForStaticSplit(code)

    expect(result.code).toMatch(/_\w+\(\{ name \}\)/)
    expect(result.code).not.toContain('__catalog')
  })

  it('handles _ctx.$t() pattern from Vue compiled templates', () => {
    const code = `_toDisplayString(_ctx.$t('Hello world'))`
    const result = transformForStaticSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).not.toContain('_ctx._')
    expect(result.code).toMatch(/_toDisplayString\(_\w+\)/)
  })
})

describe('injectCatalogImport', () => {
  it('injects virtual:fluenti/runtime import for dynamic strategy', () => {
    const code = 'const x = __catalog._abc'
    const result = injectCatalogImport(code, 'dynamic', new Set(['abc']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/runtime'")
  })

  it('injects named imports from virtual:fluenti/messages for static strategy', () => {
    const code = 'const x = _abc123'
    const result = injectCatalogImport(code, 'static', new Set(['abc123', 'def456']))

    expect(result).toContain("import { _abc123, _def456 } from 'virtual:fluenti/messages'")
  })

  it('injects virtual:fluenti/route-runtime import for per-route strategy', () => {
    const code = 'const x = __catalog._abc'
    const result = injectCatalogImport(code, 'per-route', new Set(['abc']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/route-runtime'")
    expect(result).not.toContain('virtual:fluenti/runtime')
  })
})

describe('CLI ↔ vite-plugin hash consistency', () => {
  it('vite-plugin dynamic transform produces same hash as CLI', () => {
    const message = 'Hello world'
    const cliHash = hashMessage(message)

    const code = `const text = $t('${message}')`
    const result = transformForDynamicSplit(code)

    // The vite-plugin should produce __catalog._<hash> using the same hash as CLI
    expect(result.code).toContain(`__catalog._${cliHash}`)
  })

  it('vite-plugin static transform produces same hash as CLI', () => {
    const message = 'Hello {name}'
    const cliHash = hashMessage(message)

    const code = `const text = $t('${message}', { name })`
    const result = transformForStaticSplit(code)

    // The vite-plugin should produce _<hash>({ name }) using the same hash as CLI
    expect(result.code).toContain(`_${cliHash}({ name })`)
  })

  it('hash consistency for ICU plural message', () => {
    const message = '{count, plural, one {# item} other {# items}}'
    const cliHash = hashMessage(message)

    const code = `const text = $t('${message}', { count })`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain(`__catalog._${cliHash}`)
  })

  it('hash consistency for multiple messages', () => {
    const messages = ['Hello', 'Goodbye', 'Welcome {name}']
    const cliHashes = messages.map(hashMessage)

    const code = messages.map(m => `$t('${m}')`).join('; ')
    const result = transformForDynamicSplit(code)

    for (const hash of cliHashes) {
      expect(result.usedHashes.has(hash)).toBe(true)
      expect(result.code).toContain(`_${hash}`)
    }
  })
})
