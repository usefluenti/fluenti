import { describe, it, expect } from 'vitest'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from '../src/build-transform'
import { hashMessage } from '@fluenti/core'

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

describe('transformForDynamicSplit — edge cases', () => {
  it('returns unchanged code when no $t calls exist', () => {
    const code = 'const greeting = "Hello"; console.log(greeting)'
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(false)
    expect(result.usedHashes.size).toBe(0)
    expect(result.code).toBe(code)
  })

  it('transforms a single $t call correctly', () => {
    const code = `const msg = $t('Welcome')`
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('Welcome')

    expect(result.needsCatalogImport).toBe(true)
    expect(result.usedHashes.size).toBe(1)
    expect(result.usedHashes.has(hash)).toBe(true)
    expect(result.code).toBe(`const msg = __catalog._${hash}`)
  })

  it('transforms $t with values object', () => {
    const code = `$t('Hi {user}', { user: name })`
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('Hi {user}')

    expect(result.code).toBe(`__catalog._${hash}({ user: name })`)
    expect(result.usedHashes.has(hash)).toBe(true)
  })

  it('transforms _ctx.$t pattern removing prefix', () => {
    const code = `_ctx.$t('Greet')`
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('Greet')

    expect(result.code).toBe(`__catalog._${hash}`)
    expect(result.code).not.toContain('_ctx')
  })

  it('transforms $setup.$t pattern removing prefix', () => {
    const code = `$setup.$t('Setup msg')`
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('Setup msg')

    expect(result.code).toBe(`__catalog._${hash}`)
    expect(result.code).not.toContain('$setup')
  })

  it('transforms backtick-quoted $t call', () => {
    const code = '$t(`template literal`)'
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('template literal')

    expect(result.code).toBe(`__catalog._${hash}`)
  })

  it('transforms multiple $t calls in one line', () => {
    const code = `$t('One'); $t('Two'); $t('Three')`
    const result = transformForDynamicSplit(code)

    expect(result.usedHashes.size).toBe(3)
    expect(result.code).not.toContain('$t(')
    expect(result.code).toContain(`__catalog._${hashMessage('One')}`)
    expect(result.code).toContain(`__catalog._${hashMessage('Two')}`)
    expect(result.code).toContain(`__catalog._${hashMessage('Three')}`)
  })

  it('preserves non-$t code around transformed calls', () => {
    const code = `const prefix = ">>"; const msg = $t('Hello'); const suffix = "<<"`
    const result = transformForDynamicSplit(code)
    const hash = hashMessage('Hello')

    expect(result.code).toContain('const prefix = ">>"')
    expect(result.code).toContain(`const msg = __catalog._${hash}`)
    expect(result.code).toContain('const suffix = "<<"')
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

  it('generates named imports for static split', () => {
    const code = `$t('Alpha'); $t('Beta')`
    const result = transformForStaticSplit(code)
    const hashA = hashMessage('Alpha')
    const hashB = hashMessage('Beta')

    expect(result.usedHashes.has(hashA)).toBe(true)
    expect(result.usedHashes.has(hashB)).toBe(true)
    expect(result.code).toContain(`_${hashA}`)
    expect(result.code).toContain(`_${hashB}`)
    expect(result.code).not.toContain('__catalog')
  })
})

describe('injectCatalogImport — edge cases', () => {
  it('injects dynamic import at the top of the module', () => {
    const code = 'const x = __catalog._abc\nconst y = __catalog._def'
    const result = injectCatalogImport(code, 'dynamic', new Set(['abc', 'def']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/runtime'")
    expect(result.indexOf('import')).toBe(0)
  })

  it('injects static import with all hash names', () => {
    const code = 'const x = _h1; const y = _h2; const z = _h3'
    const result = injectCatalogImport(code, 'static', new Set(['h1', 'h2', 'h3']))

    expect(result).toContain('import { _h1, _h2, _h3 }')
    expect(result).toContain("from 'virtual:fluenti/messages'")
  })

  it('injects per-route import targeting route-runtime', () => {
    const code = 'const x = __catalog._xyz'
    const result = injectCatalogImport(code, 'per-route', new Set(['xyz']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/route-runtime'")
    expect(result).not.toContain('virtual:fluenti/runtime')
    expect(result).not.toContain('virtual:fluenti/messages')
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

  it('dynamic and static transforms produce identical hashes for the same message', () => {
    const message = 'Consistent hash test'
    const cliHash = hashMessage(message)

    const dynamicResult = transformForDynamicSplit(`$t('${message}')`)
    const staticResult = transformForStaticSplit(`$t('${message}')`)

    expect(dynamicResult.usedHashes.has(cliHash)).toBe(true)
    expect(staticResult.usedHashes.has(cliHash)).toBe(true)
    expect(dynamicResult.code).toContain(`_${cliHash}`)
    expect(staticResult.code).toContain(`_${cliHash}`)
  })
})
