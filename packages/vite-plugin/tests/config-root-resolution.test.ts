import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFluentiPlugins } from '../src/index'

let tmpRoot: string | undefined

afterEach(() => {
  if (tmpRoot) {
    rmSync(tmpRoot, { recursive: true, force: true })
    tmpRoot = undefined
  }
})

describe('createFluentiPlugins root-aware config resolution', () => {
  it('resolves config using Vite root after configResolved', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'fluenti-vite-root-'))
    const appRoot = join(tmpRoot, 'apps', 'web')
    mkdirSync(appRoot, { recursive: true })
    writeFileSync(
      join(appRoot, 'fluenti.config.mjs'),
      [
        'export default {',
        "  sourceLocale: 'en',",
        "  locales: ['en', 'ja'],",
        "  catalogDir: './locales',",
        "  format: 'po',",
        "  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],",
        "  compileOutDir: './app-locales/compiled',",
        '}',
        '',
      ].join('\n'),
      'utf-8',
    )

    const plugins = createFluentiPlugins(
      {
        framework: 'vue',
        config: 'fluenti.config.mjs',
      },
      [],
    )

    const virtual = plugins.find((plugin) => plugin.name === 'fluenti:virtual')
    if (!virtual?.configResolved || !virtual.load) {
      throw new Error('missing virtual plugin hooks')
    }

    virtual.configResolved({
      root: appRoot,
      command: 'serve',
    } as never)

    const code = virtual.load('\0virtual:fluenti/messages/en')

    expect(code).toContain("export { default } from 'app-locales/compiled/en.js'")
  })
})
