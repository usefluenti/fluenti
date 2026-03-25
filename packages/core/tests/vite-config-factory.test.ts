import { describe, expect, it } from 'vitest'

import { createPackageConfig } from '../../../scripts/vite-config-factory'

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

    expect(config.plugins ?? []).toHaveLength(1)
    expect(config.plugins?.[0]?.name).toContain('dts')
  })
})
