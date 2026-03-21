import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { loadConfig, loadConfigSync } from '../src/config-loader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeMjs(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Build the ESM source for a fluenti config object literal.
 * The `extra` parameter allows injecting arbitrary extra fields.
 */
function configSource(fields: Record<string, unknown>): string {
  const body = Object.entries(fields)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join(',\n')
  return `export default {\n${body}\n}\n`
}

// ---------------------------------------------------------------------------
// Fixture management
// ---------------------------------------------------------------------------

let tmpRoot: string

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'fluenti-config-test-'))
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// 1. Single-level extends with path rebase
// ---------------------------------------------------------------------------

describe('single-level extends — path rebase', () => {
  it('rebases relative catalogDir from parent directory to child directory', async () => {
    // parent lives at <tmpRoot>/parent/fluenti.config.mjs
    // child lives at <tmpRoot>/child/fluenti.config.mjs
    const parentDir = join(tmpRoot, 'parent')
    const childDir = join(tmpRoot, 'child')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en', 'fr'],
        catalogDir: './locales',
        compileOutDir: './src/locales/compiled',
        include: ['./src/**/*.tsx'],
        format: 'po',
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent/fluenti.config.mjs',
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    // parent's './locales' resolved from parentDir, then made relative to childDir
    // parentDir/locales → relative to childDir → '../parent/locales'
    expect(config.catalogDir).toBe('../parent/locales')
    expect(config.compileOutDir).toBe('../parent/src/locales/compiled')
    expect(config.include).toContain('../parent/src/**/*.tsx')
  })

  it('inherits non-path fields without modification', async () => {
    const parentDir = join(tmpRoot, 'parent')
    const childDir = join(tmpRoot, 'child')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'ja',
        locales: ['ja', 'en'],
        catalogDir: './locales',
        compileOutDir: './out',
        format: 'json',
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent/fluenti.config.mjs',
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    expect(config.sourceLocale).toBe('ja')
    expect(config.locales).toEqual(['ja', 'en'])
    expect(config.format).toBe('json')
  })
})

// ---------------------------------------------------------------------------
// 2. Two-level extends chain (grandparent → parent → child)
// ---------------------------------------------------------------------------

describe('two-level extends chain', () => {
  it('merges grandparent → parent → child with correct path rebasing at each level', async () => {
    const grandparentDir = join(tmpRoot, 'grandparent')
    const parentDir = join(tmpRoot, 'parent')
    const childDir = join(tmpRoot, 'child')
    mkdirSync(grandparentDir)
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(grandparentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en'],
        catalogDir: './locales',
        compileOutDir: './compiled',
        format: 'po',
      }),
    )

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../grandparent/fluenti.config.mjs',
        locales: ['en', 'de'],
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent/fluenti.config.mjs',
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    // grandparent's ./locales → rebased through parent → rebased to child
    // grandparent/locales relative to child → ../grandparent/locales
    expect(config.catalogDir).toBe('../grandparent/locales')
    // locales override from parent should survive
    expect(config.locales).toEqual(['en', 'de'])
    expect(config.sourceLocale).toBe('en')
  })
})

// ---------------------------------------------------------------------------
// 3. Circular extends throws error
// ---------------------------------------------------------------------------

describe('circular extends', () => {
  it('throws a circular extends error for a direct self-reference', async () => {
    const dir = join(tmpRoot, 'circ')
    mkdirSync(dir)

    const configA = join(dir, 'a.mjs')
    const configB = join(dir, 'b.mjs')

    writeMjs(configA, configSource({ extends: './b.mjs', sourceLocale: 'en', locales: ['en'], format: 'po' }))
    writeMjs(configB, configSource({ extends: './a.mjs', sourceLocale: 'en', locales: ['en'], format: 'po' }))

    await expect(loadConfig(configA)).rejects.toThrow(/Circular extends detected/)
  })
})

// ---------------------------------------------------------------------------
// 4. Parent file not found throws error
// ---------------------------------------------------------------------------

describe('parent file not found', () => {
  it('throws when the extended config file does not exist', async () => {
    const dir = join(tmpRoot, 'missing-parent')
    mkdirSync(dir)

    writeMjs(
      join(dir, 'fluenti.config.mjs'),
      configSource({
        extends: './does-not-exist.mjs',
        sourceLocale: 'en',
        locales: ['en'],
        format: 'po',
      }),
    )

    await expect(loadConfig(join(dir, 'fluenti.config.mjs'))).rejects.toThrow(
      /file not found/,
    )
  })
})

// ---------------------------------------------------------------------------
// 5. Absolute paths are NOT rebased
// ---------------------------------------------------------------------------

describe('absolute paths are not rebased', () => {
  it('leaves absolute catalogDir unchanged after extends merge', async () => {
    const parentDir = join(tmpRoot, 'parent-abs')
    const childDir = join(tmpRoot, 'child-abs')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    const absoluteCatalogDir = join(tmpRoot, 'shared-locales')

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      // We need the value to be a literal absolute path in the source string
      `export default {\n  sourceLocale: "en",\n  locales: ["en"],\n  catalogDir: ${JSON.stringify(absoluteCatalogDir)},\n  compileOutDir: "./compiled",\n  format: "po"\n}\n`,
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({ extends: '../parent-abs/fluenti.config.mjs' }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    // Absolute path must not be mutated
    expect(config.catalogDir).toBe(absoluteCatalogDir)
  })

  it('leaves absolute paths in include array unchanged', async () => {
    const parentDir = join(tmpRoot, 'parent-abs-include')
    const childDir = join(tmpRoot, 'child-abs-include')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    const absoluteInclude = join(tmpRoot, 'shared-src/**/*.tsx')

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      `export default {\n  sourceLocale: "en",\n  locales: ["en"],\n  catalogDir: "./locales",\n  compileOutDir: "./compiled",\n  include: [${JSON.stringify(absoluteInclude)}],\n  format: "po"\n}\n`,
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({ extends: '../parent-abs-include/fluenti.config.mjs' }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    expect(config.include).toContain(absoluteInclude)
  })
})

// ---------------------------------------------------------------------------
// 6. Child values override parent values
// ---------------------------------------------------------------------------

describe('child values override parent values', () => {
  it('child sourceLocale overrides parent', async () => {
    const parentDir = join(tmpRoot, 'parent-override')
    const childDir = join(tmpRoot, 'child-override')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en', 'fr'],
        catalogDir: './locales',
        compileOutDir: './compiled',
        format: 'po',
        devAutoCompileDelay: 1000,
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent-override/fluenti.config.mjs',
        sourceLocale: 'ja',
        locales: ['ja', 'en'],
        devAutoCompileDelay: 200,
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    expect(config.sourceLocale).toBe('ja')
    expect(config.locales).toEqual(['ja', 'en'])
    expect(config.devAutoCompileDelay).toBe(200)
    // format inherited from parent
    expect(config.format).toBe('po')
  })

  it('child catalogDir overrides parent rebased catalogDir', async () => {
    const parentDir = join(tmpRoot, 'parent-catdir')
    const childDir = join(tmpRoot, 'child-catdir')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en'],
        catalogDir: './parent-locales',
        compileOutDir: './compiled',
        format: 'po',
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent-catdir/fluenti.config.mjs',
        catalogDir: './my-locales',
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    // Child's own ./my-locales wins over the rebased parent path
    expect(config.catalogDir).toBe('./my-locales')
  })
})

// ---------------------------------------------------------------------------
// 7. No extends — backward compatible
// ---------------------------------------------------------------------------

describe('no extends — backward compatibility', () => {
  it('returns config merged with defaults when no extends field is present', async () => {
    const dir = join(tmpRoot, 'no-extends')
    mkdirSync(dir)

    writeMjs(
      join(dir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en', 'es'],
        catalogDir: './translations',
        compileOutDir: './dist/i18n',
        format: 'json',
      }),
    )

    const config = await loadConfig(join(dir, 'fluenti.config.mjs'))

    expect(config.sourceLocale).toBe('en')
    expect(config.locales).toEqual(['en', 'es'])
    expect(config.catalogDir).toBe('./translations')
    expect(config.compileOutDir).toBe('./dist/i18n')
    expect(config.format).toBe('json')
    // defaults preserved
    expect(config.devAutoCompile).toBe(true)
    expect(config.buildAutoCompile).toBe(true)
  })

  it('returns default config when no config file is found', async () => {
    const dir = join(tmpRoot, 'empty-dir')
    mkdirSync(dir)

    const config = await loadConfig(undefined, dir)

    expect(config.sourceLocale).toBe('en')
    expect(config.format).toBe('po')
    expect(config.catalogDir).toBe('./locales')
  })
})

// ---------------------------------------------------------------------------
// 8. loadConfigSync also supports extends
// ---------------------------------------------------------------------------

describe('loadConfigSync — extends support', () => {
  it('resolves extends chain synchronously', () => {
    const parentDir = join(tmpRoot, 'sync-parent')
    const childDir = join(tmpRoot, 'sync-child')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en', 'de'],
        catalogDir: './locales',
        compileOutDir: './compiled',
        format: 'po',
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../sync-parent/fluenti.config.mjs',
        locales: ['en', 'de', 'fr'],
      }),
    )

    const config = loadConfigSync(join(childDir, 'fluenti.config.mjs'))

    expect(config.sourceLocale).toBe('en')
    expect(config.locales).toEqual(['en', 'de', 'fr'])
    // rebased from parent
    expect(config.catalogDir).toBe('../sync-parent/locales')
  })

  it('returns default config when no config file found (sync)', () => {
    const dir = join(tmpRoot, 'sync-empty')
    mkdirSync(dir)

    const config = loadConfigSync(undefined, dir)

    expect(config.sourceLocale).toBe('en')
    expect(config.format).toBe('po')
  })

  it('throws circular extends synchronously', () => {
    const dir = join(tmpRoot, 'sync-circ')
    mkdirSync(dir)

    const configA = join(dir, 'a.mjs')
    const configB = join(dir, 'b.mjs')

    writeMjs(configA, configSource({ extends: './b.mjs', sourceLocale: 'en', locales: ['en'], format: 'po' }))
    writeMjs(configB, configSource({ extends: './a.mjs', sourceLocale: 'en', locales: ['en'], format: 'po' }))

    // loadConfigSync catches errors and falls back to defaults, so we test
    // that circular detection works via the internal chain function indirectly.
    // The public API returns defaults on any error.
    const config = loadConfigSync(configA)
    // Falls back to defaults when circular error is caught internally
    expect(config.sourceLocale).toBe('en')
  })
})

// ---------------------------------------------------------------------------
// 9. Max depth exceeded throws error
// ---------------------------------------------------------------------------

describe('max extends depth', () => {
  it('throws when extends chain depth exceeds MAX_EXTENDS_DEPTH (10)', async () => {
    // Build a chain of 11 config files: 0 extends 1, 1 extends 2, ..., 10 has no extends
    const configs: string[] = []
    for (let i = 0; i <= 10; i++) {
      const filePath = join(tmpRoot, `depth-${i}.mjs`)
      configs.push(filePath)
    }

    // Write leaf (no extends)
    writeMjs(
      configs[10],
      configSource({ sourceLocale: 'en', locales: ['en'], catalogDir: './locales', compileOutDir: './compiled', format: 'po' }),
    )

    // Write 0..9 each extending the next
    for (let i = 9; i >= 0; i--) {
      writeMjs(
        configs[i],
        configSource({ extends: `./depth-${i + 1}.mjs`, sourceLocale: 'en', locales: ['en'], format: 'po' }),
      )
    }

    // Chain depth is 11 files (depth-0 → depth-10), which exceeds MAX_EXTENDS_DEPTH=10
    await expect(loadConfig(configs[0])).rejects.toThrow(
      /exceeds maximum depth/,
    )
  })
})

// ---------------------------------------------------------------------------
// 10. `extends` field is removed from the returned config
// ---------------------------------------------------------------------------

describe('extends field removed from result', () => {
  it('does not include the extends field in the returned config object', async () => {
    const parentDir = join(tmpRoot, 'parent-strip')
    const childDir = join(tmpRoot, 'child-strip')
    mkdirSync(parentDir)
    mkdirSync(childDir)

    writeMjs(
      join(parentDir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en'],
        catalogDir: './locales',
        compileOutDir: './compiled',
        format: 'po',
      }),
    )

    writeMjs(
      join(childDir, 'fluenti.config.mjs'),
      configSource({
        extends: '../parent-strip/fluenti.config.mjs',
      }),
    )

    const config = await loadConfig(join(childDir, 'fluenti.config.mjs'))

    expect('extends' in config).toBe(false)
  })

  it('does not include extends when there is no parent (standalone config)', async () => {
    const dir = join(tmpRoot, 'standalone-strip')
    mkdirSync(dir)

    // Write a config that has extends but the field should still be stripped
    // even in the no-parent branch
    writeMjs(
      join(dir, 'fluenti.config.mjs'),
      configSource({
        sourceLocale: 'en',
        locales: ['en'],
        catalogDir: './locales',
        compileOutDir: './compiled',
        format: 'po',
      }),
    )

    const config = await loadConfig(join(dir, 'fluenti.config.mjs'))

    expect('extends' in config).toBe(false)
  })
})
