import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  createDtsPluginOptions,
  createPackageConfig,
  rewriteDeclarationImportSpecifiers,
} from '../../../scripts/vite-config-factory'

describe('createPackageConfig', () => {
  const configFactory = createPackageConfig({
    entry: { index: 'src/index.ts' },
    external: [],
    coverage: { lines: 90, branches: 85, functions: 90, statements: 90 },
  })

  it('does not load dts plugin for serve/test config resolution', async () => {
    const config = await configFactory({
      command: 'serve',
      mode: 'test',
      isPreview: false,
      isSsrBuild: false,
    })

    expect(config.plugins ?? []).toHaveLength(0)
  })

  it('loads dts plugin for build config resolution', async () => {
    const config = await configFactory({
      command: 'build',
      mode: 'production',
      isPreview: false,
      isSsrBuild: false,
    })

    expect(config.plugins ?? []).toHaveLength(2)
    expect(config.plugins?.[0]?.name).toContain('dts')
    expect(config.plugins?.[1]?.name).toBe('fluenti:remove-source-maps')
    expect(config.build?.sourcemap).toBe(false)
  })

  it('rewrites sibling package source imports to published package specifiers', () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
    const content = [
      "import type { FluentiCoreConfig } from '../../core/src/index.ts'",
      "export { detectLocale } from '../../core/src/ssr-entry.ts'",
      "type Runtime = import('../../vite-plugin/src/index.ts').RuntimeGenerator",
      "type Local = import('./context').FluentiContext",
      '//# sourceMappingURL=types.d.ts.map',
    ].join('\n')

    const filePath = resolve(repoRoot, 'packages/solid/dist/solid/src/types.d.ts')
    const rewritten = rewriteDeclarationImportSpecifiers(content, filePath)

    expect(rewritten).toContain(
      "import type { FluentiCoreConfig } from '@fluenti/core'",
    )
    expect(rewritten).toContain(
      "export { detectLocale } from '@fluenti/core/ssr'",
    )
    expect(rewritten).toContain(
      "type Runtime = import('@fluenti/vite-plugin').RuntimeGenerator",
    )
    expect(rewritten).toContain(
      "type Local = import('./context').FluentiContext",
    )
    expect(rewritten).not.toContain('sourceMappingURL=')
  })

  it('forces declaration maps off for dts generation', () => {
    const dtsOptions = createDtsPluginOptions({
      tsconfigPath: './tsconfig.build.json',
      compilerOptions: {
        incremental: true,
        declarationMap: true,
        sourceMap: true,
      },
    })

    expect(dtsOptions['tsconfigPath']).toBe('./tsconfig.build.json')
    expect(dtsOptions['compilerOptions']).toMatchObject({
      incremental: true,
      declarationMap: false,
      sourceMap: false,
    })
  })
})
