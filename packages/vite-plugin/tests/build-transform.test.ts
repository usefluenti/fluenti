import { describe, it, expect } from 'vitest'
import { transformForDynamicSplit, transformForStaticSplit, injectCatalogImport } from '../src/build-transform'
import { hashMessage } from '@fluenti/core'

function catalogIdForSource(message: string): string {
  return hashMessage(message)
}

function dynamicCatalogAccess(catalogId: string): string {
  return `__catalog[${JSON.stringify(catalogId)}]`
}

function staticExportAccess(catalogId: string): string {
  return `_${hashMessage(catalogId)}`
}

describe('transformForDynamicSplit', () => {
  it('transforms $t calls to __catalog[catalogId] references', () => {
    const code = `const text = $t('Hello world')`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
    expect(result.code).not.toContain("$t('Hello world')")
  })

  it('transforms $t with values to __catalog[catalogId](values)', () => {
    const code = `const text = $t('Hello {name}', { name })`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain(`${dynamicCatalogAccess(catalogIdForSource('Hello {name}'))}({ name })`)
  })

  it('collects used hashes', () => {
    const code = `$t('a'); $t('b')`
    const result = transformForDynamicSplit(code)

    expect(result.usedHashes.size).toBe(2)
  })

  it('returns false for needsCatalogImport when no tracked translation calls exist', () => {
    const code = `const x = 1`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(false)
    expect(result.code).toBe(code)
  })

  it('handles _ctx.$t() pattern from Vue compiled templates', () => {
    const code = `_toDisplayString(_ctx.$t('Hello world'))`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
    // _ctx. prefix should be removed — __catalog is a module-level import
    expect(result.code).not.toContain('_ctx.__catalog')
    expect(result.code).toContain(`_toDisplayString(${dynamicCatalogAccess(catalogIdForSource('Hello world'))})`)
  })

  it('handles _ctx.$t() with values', () => {
    const code = `_toDisplayString(_ctx.$t('Hello {name}', { name }))`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain(`_toDisplayString(${dynamicCatalogAccess(catalogIdForSource('Hello {name}'))}({ name }))`)
  })

  it('handles $setup.$t() pattern', () => {
    const code = `_toDisplayString($setup.$t('Hello'))`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello')))
    expect(result.code).not.toContain('$setup.__catalog')
  })

  it('transforms runtime t() destructured from useI18n()', () => {
    const code = [
      "import { useI18n } from '@fluenti/react'",
      'function Home(name) {',
      '  const { t } = useI18n()',
      "  return t('Hello, {name}!', { name })",
      '}',
    ].join('\n')
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(`${dynamicCatalogAccess(catalogIdForSource('Hello, {name}!'))}({ name })`)
    expect(result.code).not.toContain("t('Hello, {name}!', { name })")
  })

  it('transforms aliased runtime t() destructured from useI18n()', () => {
    const code = [
      "import { useI18n } from '@fluenti/vue'",
      'function Home(name) {',
      '  const { t: translate } = useI18n()',
      "  return translate('Welcome')",
      '}',
    ].join('\n')
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Welcome')))
    expect(result.code).not.toContain("translate('Welcome')")
  })

  it('transforms scope-transform descriptor calls', () => {
    const code = [
      "import { useI18n } from '@fluenti/react'",
      'function Home(name) {',
      '  const { t: __fluenti_t } = useI18n()',
      "  return __fluenti_t({ id: 'hero.greeting', message: 'Hello, {name}!' }, { name })",
      '}',
    ].join('\n')
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(`${dynamicCatalogAccess('hero.greeting')}({ name })`)
    expect(result.usedHashes.has('hero.greeting')).toBe(true)
  })

  it('handles _ctx.t() pattern from Vue useI18n exposure', () => {
    const code = `_toDisplayString(_ctx.t('Hello world'))`
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
    expect(result.code).not.toContain('_ctx.__catalog')
  })

  it('handles _unref(t)() pattern from Vue compiled setup bindings', () => {
    const code = [
      "import { unref as _unref } from 'vue'",
      "import { useI18n } from '@fluenti/vue'",
      'function render() {',
      '  const { t } = useI18n()',
      "  return _toDisplayString(_unref(t)('Hello world'))",
      '}',
    ].join('\n')
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
    expect(result.code).not.toContain("_unref(t)('Hello world')")
  })

  it('handles backtick-quoted $t() from Vue 3 compiled templates', () => {
    const code = '_toDisplayString(_ctx.$t(`Hello world`))'
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
    expect(result.code).not.toContain('$t(')
  })

  it('handles double-quoted $t() calls', () => {
    const code = 'const text = $t("Hello world")'
    const result = transformForDynamicSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Hello world')))
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
    const catalogId = catalogIdForSource('Welcome')

    expect(result.needsCatalogImport).toBe(true)
    expect(result.usedHashes.size).toBe(1)
    expect(result.usedHashes.has(catalogId)).toBe(true)
    expect(result.code).toBe(`const msg = ${dynamicCatalogAccess(catalogId)}`)
  })

  it('transforms $t with values object', () => {
    const code = `$t('Hi {user}', { user: name })`
    const result = transformForDynamicSplit(code)
    const catalogId = catalogIdForSource('Hi {user}')

    expect(result.code).toBe(`${dynamicCatalogAccess(catalogId)}({ user: name })`)
    expect(result.usedHashes.has(catalogId)).toBe(true)
  })

  it('transforms _ctx.$t pattern removing prefix', () => {
    const code = `_ctx.$t('Greet')`
    const result = transformForDynamicSplit(code)
    const catalogId = catalogIdForSource('Greet')

    expect(result.code).toBe(dynamicCatalogAccess(catalogId))
    expect(result.code).not.toContain('_ctx')
  })

  it('transforms $setup.$t pattern removing prefix', () => {
    const code = `$setup.$t('Setup msg')`
    const result = transformForDynamicSplit(code)
    const catalogId = catalogIdForSource('Setup msg')

    expect(result.code).toBe(dynamicCatalogAccess(catalogId))
    expect(result.code).not.toContain('$setup')
  })

  it('transforms backtick-quoted $t call', () => {
    const code = '$t(`template literal`)'
    const result = transformForDynamicSplit(code)
    const catalogId = catalogIdForSource('template literal')

    expect(result.code).toBe(dynamicCatalogAccess(catalogId))
  })

  it('transforms multiple $t calls in one line', () => {
    const code = `$t('One'); $t('Two'); $t('Three')`
    const result = transformForDynamicSplit(code)

    expect(result.usedHashes.size).toBe(3)
    expect(result.code).not.toContain('$t(')
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('One')))
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Two')))
    expect(result.code).toContain(dynamicCatalogAccess(catalogIdForSource('Three')))
  })

  it('preserves non-$t code around transformed calls', () => {
    const code = `const prefix = ">>"; const msg = $t('Hello'); const suffix = "<<"`
    const result = transformForDynamicSplit(code)
    const catalogId = catalogIdForSource('Hello')

    expect(result.code).toContain('const prefix = ">>"')
    expect(result.code).toContain(`const msg = ${dynamicCatalogAccess(catalogId)}`)
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

  it('handles _unref(t)() pattern for static split', () => {
    const code = [
      "import { unref as _unref } from 'vue'",
      "import { useI18n } from '@fluenti/vue'",
      'function render() {',
      '  const { t } = useI18n()',
      "  return _toDisplayString(_unref(t)('Hello world'))",
      '}',
    ].join('\n')
    const result = transformForStaticSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toMatch(/_toDisplayString\(_\w+\)/)
    expect(result.code).not.toContain("_unref(t)('Hello world')")
  })

  it('generates named imports for static split', () => {
    const code = `$t('Alpha'); $t('Beta')`
    const result = transformForStaticSplit(code)
    const hashA = catalogIdForSource('Alpha')
    const hashB = catalogIdForSource('Beta')

    expect(result.usedHashes.has(hashA)).toBe(true)
    expect(result.usedHashes.has(hashB)).toBe(true)
    expect(result.code).toContain(staticExportAccess(hashA))
    expect(result.code).toContain(staticExportAccess(hashB))
    expect(result.code).not.toContain('__catalog')
  })

  it('transforms runtime t() destructured from useI18n()', () => {
    const code = [
      "import { useI18n } from '@fluenti/solid'",
      'function Home() {',
      '  const { t } = useI18n()',
      "  return t('Home')",
      '}',
    ].join('\n')
    const result = transformForStaticSplit(code)

    expect(result.needsCatalogImport).toBe(true)
    expect(result.code).toContain(staticExportAccess(catalogIdForSource('Home')))
    expect(result.code).not.toContain("__catalog")
  })
})

describe('injectCatalogImport — edge cases', () => {
  it('injects dynamic import at the top of the module', () => {
    const code = "const x = __catalog['abc']\nconst y = __catalog['def']"
    const result = injectCatalogImport(code, 'dynamic', new Set(['abc', 'def']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/runtime'")
    expect(result.indexOf('import')).toBe(0)
  })

  it('injects static import with all hash names', () => {
    const code = 'const x = _h1; const y = _h2; const z = _h3'
    const result = injectCatalogImport(code, 'static', new Set(['h1', 'h2', 'h3']))

    expect(result).toContain(`import { ${staticExportAccess('h1')}, ${staticExportAccess('h2')}, ${staticExportAccess('h3')} }`)
    expect(result).toContain("from 'virtual:fluenti/messages'")
  })

  it('injects per-route import targeting route-runtime', () => {
    const code = "const x = __catalog['xyz']"
    const result = injectCatalogImport(code, 'per-route', new Set(['xyz']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/route-runtime'")
    expect(result).not.toContain('virtual:fluenti/runtime')
    expect(result).not.toContain('virtual:fluenti/messages')
  })
})

describe('injectCatalogImport', () => {
  it('injects virtual:fluenti/runtime import for dynamic strategy', () => {
    const code = "const x = __catalog['abc']"
    const result = injectCatalogImport(code, 'dynamic', new Set(['abc']))

    expect(result).toContain("import { __catalog } from 'virtual:fluenti/runtime'")
  })

  it('injects named imports from virtual:fluenti/messages for static strategy', () => {
    const code = 'const x = _abc123'
    const result = injectCatalogImport(code, 'static', new Set(['abc123', 'def456']))

    expect(result).toContain(`import { ${staticExportAccess('abc123')}, ${staticExportAccess('def456')} } from 'virtual:fluenti/messages'`)
  })

  it('injects virtual:fluenti/route-runtime import for per-route strategy', () => {
    const code = "const x = __catalog['abc']"
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

    // The vite-plugin should produce __catalog[<catalog id>] using the same id as CLI
    expect(result.code).toContain(dynamicCatalogAccess(cliHash))
  })

  it('vite-plugin static transform produces same hash as CLI', () => {
    const message = 'Hello {name}'
    const cliHash = hashMessage(message)

    const code = `const text = $t('${message}', { name })`
    const result = transformForStaticSplit(code)

    // The vite-plugin should produce the named export for the CLI catalog id
    expect(result.code).toContain(`${staticExportAccess(cliHash)}({ name })`)
  })

  it('hash consistency for ICU plural message', () => {
    const message = '{count, plural, one {# item} other {# items}}'
    const cliHash = hashMessage(message)

    const code = `const text = $t('${message}', { count })`
    const result = transformForDynamicSplit(code)

    expect(result.code).toContain(dynamicCatalogAccess(cliHash))
  })

  it('hash consistency for multiple messages', () => {
    const messages = ['Hello', 'Goodbye', 'Welcome {name}']
    const cliHashes = messages.map((message) => hashMessage(message))

    const code = messages.map(m => `$t('${m}')`).join('; ')
    const result = transformForDynamicSplit(code)

    for (const hash of cliHashes) {
      expect(result.usedHashes.has(hash)).toBe(true)
      expect(result.code).toContain(dynamicCatalogAccess(hash))
    }
  })

  it('dynamic and static transforms produce identical hashes for the same message', () => {
    const message = 'Consistent hash test'
    const cliHash = hashMessage(message)

    const dynamicResult = transformForDynamicSplit(`$t('${message}')`)
    const staticResult = transformForStaticSplit(`$t('${message}')`)

    expect(dynamicResult.usedHashes.has(cliHash)).toBe(true)
    expect(staticResult.usedHashes.has(cliHash)).toBe(true)
    expect(dynamicResult.code).toContain(dynamicCatalogAccess(cliHash))
    expect(staticResult.code).toContain(staticExportAccess(cliHash))
  })
})
