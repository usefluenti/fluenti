/**
 * E2E: Subpath import verification — validates new package.json exports.
 *
 * Uses esbuild to bundle minimal files that import from subpaths.
 * Verifies the imports resolve and the bundles are correct size.
 * No server needed.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { gzipSync } from 'node:zlib'

const ROOT = join(import.meta.dirname, '..')

function bundleAndMeasure(code: string, externals: string[] = []): { raw: number; gzip: number; content: string } {
  const tmp = mkdtempSync(join(tmpdir(), 'fluenti-subpath-'))
  const input = join(tmp, 'input.mjs')
  const output = join(tmp, 'output.mjs')
  writeFileSync(input, code)

  const externalFlags = externals.map((e) => `--external:${e}`).join(' ')
  execSync(
    `npx esbuild ${input} --bundle --minify --format=esm --outfile=${output} ${externalFlags}`,
    { cwd: ROOT, stdio: 'pipe', timeout: 30_000 },
  )

  const content = readFileSync(output, 'utf-8')
  const raw = Buffer.byteLength(content)
  const gzip = gzipSync(content).length
  return { raw, gzip, content }
}

describe('subpath imports', () => {
  it('@fluenti/core/ssr exports resolve and bundle', () => {
    const result = bundleAndMeasure(`
      import { detectLocale, getSSRLocaleScript, getHydratedLocale } from '${ROOT}/packages/core/dist/ssr-entry.js'
      globalThis.__x = { detectLocale, getSSRLocaleScript, getHydratedLocale }
    `)
    expect(result.raw).toBeGreaterThan(0)
    expect(result.content).toContain('detectLocale')
  })

  it('@fluenti/core/runtime exports resolve and bundle', () => {
    const result = bundleAndMeasure(`
      import { interpolate, formatDate, formatNumber, formatRelativeTime } from '${ROOT}/packages/core/dist/runtime.js'
      globalThis.__x = { interpolate, formatDate, formatNumber, formatRelativeTime }
    `)
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/core/compiler exports resolve and bundle', () => {
    const result = bundleAndMeasure(`
      import { parse, compile, resolveLocaleCodes } from '${ROOT}/packages/core/dist/compiler.js'
      globalThis.__x = { parse, compile, resolveLocaleCodes }
    `)
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/react runtime exports resolve and bundle', () => {
    const result = bundleAndMeasure(
      `
      import { I18nProvider, useI18n, createFluenti } from '${ROOT}/packages/react/dist/index.js'
      globalThis.__x = { I18nProvider, useI18n, createFluenti }
    `,
      ['react', 'react-dom', 'react/jsx-runtime'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/react main entry also re-exports components', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '${ROOT}/packages/react/dist/index.js'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['react', 'react-dom', 'react/jsx-runtime'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/react/components subpath resolves and bundles', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/react/components'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['react', 'react-dom', 'react/jsx-runtime'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/vue runtime exports resolve and bundle', () => {
    const result = bundleAndMeasure(
      `
      import { createFluenti, useI18n } from '${ROOT}/packages/vue/dist/index.js'
      globalThis.__x = { createFluenti, useI18n }
    `,
      ['vue'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/vue main entry also re-exports components', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '${ROOT}/packages/vue/dist/index.js'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['vue'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/vue/components subpath resolves and bundles', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/vue/components'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['vue'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/solid runtime exports resolve and bundle', () => {
    const result = bundleAndMeasure(
      `
      import { I18nProvider, useI18n, createFluenti } from '${ROOT}/packages/solid/dist/index.js'
      globalThis.__x = { I18nProvider, useI18n, createFluenti }
    `,
      ['solid-js', 'solid-js/web', 'solid-js/store'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/solid main entry also re-exports components', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '${ROOT}/packages/solid/dist/index.js'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['solid-js', 'solid-js/web', 'solid-js/store'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('@fluenti/solid/components subpath resolves and bundles', () => {
    const result = bundleAndMeasure(
      `
      import { Trans, Plural, Select, DateTime, NumberFormat } from '@fluenti/solid/components'
      globalThis.__x = { Trans, Plural, Select, DateTime, NumberFormat }
    `,
      ['solid-js', 'solid-js/web', 'solid-js/store'],
    )
    expect(result.raw).toBeGreaterThan(0)
  })

  it('importing only createFluentiCore from @fluenti/core produces a slim bundle (no parser)', () => {
    const result = bundleAndMeasure(`
      import { createFluentiCore } from '${ROOT}/packages/core/dist/index.js'
      globalThis.__x = createFluentiCore
    `)
    // Slim core should be < 4 KB gzip (no parser/compiler/SSR/formatters)
    expect(result.gzip).toBeLessThan(4000)
    // Should NOT contain parser signatures
    expect(result.content).not.toContain('FluentParseError')
    expect(result.content).not.toContain('MAX_NESTING_DEPTH')
  })

  it('Core+React bundle stays within the main-entry DX budget (~3310 B gzip)', () => {
    const result = bundleAndMeasure(
      `
      import { I18nProvider, useI18n, createFluenti } from '${ROOT}/packages/react/dist/index.js'
      globalThis.__x = { I18nProvider, useI18n, createFluenti }
    `,
      ['react', 'react-dom', 'react/jsx-runtime'],
    )
    expect(result.gzip).toBeLessThan(3310)
  })

  it('Core+Vue bundle stays within the main-entry DX budget (~3710 B gzip)', () => {
    const result = bundleAndMeasure(
      `
      import { createFluenti, useI18n } from '${ROOT}/packages/vue/dist/index.js'
      globalThis.__x = { createFluenti, useI18n }
    `,
      ['vue'],
    )
    expect(result.gzip).toBeLessThan(3710)
  })

  it('Core+Solid bundle is smaller than Lingui (~3300 B gzip)', () => {
    const result = bundleAndMeasure(
      `
      import { I18nProvider, useI18n } from '${ROOT}/packages/solid/dist/index.js'
      globalThis.__x = { I18nProvider, useI18n }
    `,
      ['solid-js', 'solid-js/web', 'solid-js/store'],
    )
    expect(result.gzip).toBeLessThan(3300)
  })
})
