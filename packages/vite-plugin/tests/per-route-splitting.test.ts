import { describe, it, expect, vi, beforeEach } from 'vitest'
import fluentiPlugin from '../src/index'

/**
 * FNV-1a hash — identical to @fluenti/cli and build-transform.ts.
 */
function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function makeCatalogSource(locale: string): string {
  const h1 = hashMessage('Hello')
  const h2 = hashMessage('About us')
  const h3 = hashMessage('Welcome')

  if (locale === 'ja') {
    return [
      `/* @__PURE__ */ export const _${h1} = "こんにちは"`,
      `export const _${h2} = "私たちについて"`,
      `export const _${h3} = "ようこそ"`,
    ].join('\n')
  }
  return [
    `/* @__PURE__ */ export const _${h1} = "Hello"`,
    `export const _${h2} = "About us"`,
    `export const _${h3} = "Welcome"`,
  ].join('\n')
}

// Mock readCatalogSource in route-resolve module
vi.mock('../src/route-resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/route-resolve')>()
  return {
    ...actual,
    readCatalogSource: vi.fn((_dir: string, locale: string) => {
      if (locale === 'en' || locale === 'ja') {
        return makeCatalogSource(locale)
      }
      return undefined
    }),
  }
})

describe('per-route splitting', () => {
  let plugins: ReturnType<typeof fluentiPlugin>

  beforeEach(() => {
    plugins = fluentiPlugin({
      splitting: 'per-route',
      catalogDir: 'src/locales/compiled',
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      framework: 'vue',
    })
  })

  function getBuildSplitPlugin() {
    return plugins.find((p) => p.name === 'fluenti:build-split')!
  }

  function getVirtualPlugin() {
    return plugins.find((p) => p.name === 'fluenti:virtual')!
  }

  describe('transform', () => {
    it('transforms $t calls and injects route-runtime import', () => {
      const plugin = getBuildSplitPlugin()
      const mockContext = {
        environment: { mode: 'build' },
      }

      const code = `const text = $t('Hello')`
      const result = (plugin.transform as any).call(mockContext, code, 'src/pages/index.vue?type=script')

      expect(result).toBeDefined()
      expect(result.code).toContain("import { __catalog } from 'virtual:fluenti/route-runtime'")
      expect(result.code).toContain('__catalog._')
      expect(result.code).not.toContain("$t('Hello')")
    })

    it('transforms _ctx.$t() in compiled Vue templates', () => {
      const plugin = getBuildSplitPlugin()
      const mockContext = {
        environment: { mode: 'build' },
      }

      const code = `_toDisplayString(_ctx.$t('Hello'))`
      const result = (plugin.transform as any).call(mockContext, code, 'src/pages/index.vue?vue&type=template&lang.js')

      expect(result).toBeDefined()
      expect(result.code).toContain('__catalog._')
      expect(result.code).not.toContain('_ctx.__catalog')
    })
  })

  describe('virtual module resolution', () => {
    it('resolves virtual:fluenti/route-runtime', () => {
      const plugin = getVirtualPlugin()
      // Trigger configResolved to set build mode
      if (plugin.configResolved) {
        ;(plugin.configResolved as any)({ command: 'build' })
      }

      const resolved = (plugin.resolveId as any)('virtual:fluenti/route-runtime')
      expect(resolved).toBe('\0virtual:fluenti/route-runtime')
    })

    it('loads route runtime module', () => {
      const plugin = getVirtualPlugin()
      const code = (plugin.load as any)('\0virtual:fluenti/route-runtime')

      expect(code).toBeDefined()
      expect(code).toContain('__catalog')
      expect(code).toContain('__loadRoute')
      expect(code).toContain('__switchLocale')
    })
  })

  describe('generateBundle', () => {
    it('emits shared and route-specific chunks', () => {
      const plugin = getBuildSplitPlugin()
      const mockContext = {
        environment: { mode: 'build' },
      }

      const helloHash = hashMessage('Hello')
      const aboutHash = hashMessage('About us')
      const welcomeHash = hashMessage('Welcome')

      // Simulate transforms to populate moduleMessages
      ;(plugin.transform as any).call(
        mockContext,
        `$t('Hello'); $t('Welcome')`,
        'src/pages/index.vue?type=script',
      )
      ;(plugin.transform as any).call(
        mockContext,
        `$t('About us'); $t('Welcome')`,
        'src/pages/about.vue?type=script',
      )

      // Build mock bundle — 'Welcome' is in both chunks (shared), others are route-specific
      const bundle: Record<string, any> = {
        'assets/index-abc123.js': {
          type: 'chunk',
          modules: {
            'src/pages/index.vue?type=script': {},
          },
        },
        'assets/about-def456.js': {
          type: 'chunk',
          modules: {
            'src/pages/about.vue?type=script': {},
          },
        },
      }

      const emitted: Array<{ type: string; fileName: string; source: string }> = []
      const generateContext = {
        emitFile: (file: any) => emitted.push(file),
      }

      ;(plugin.generateBundle as any).call(generateContext, {}, bundle)

      // Should emit shared chunk for 'Welcome' (used in both routes)
      const sharedEn = emitted.find((f) => f.fileName === '_fluenti/shared-en.js')
      expect(sharedEn).toBeDefined()
      expect(sharedEn!.source).toContain(`_${welcomeHash}`)
      expect(sharedEn!.source).not.toContain(`_${helloHash}`)
      expect(sharedEn!.source).not.toContain(`_${aboutHash}`)

      // Should emit route-specific chunk for index (Hello only)
      const indexEn = emitted.find((f) => f.fileName === '_fluenti/index-en.js')
      expect(indexEn).toBeDefined()
      expect(indexEn!.source).toContain(`_${helloHash}`)
      expect(indexEn!.source).not.toContain(`_${welcomeHash}`)

      // Should emit route-specific chunk for about (About us only)
      const aboutEn = emitted.find((f) => f.fileName === '_fluenti/about-en.js')
      expect(aboutEn).toBeDefined()
      expect(aboutEn!.source).toContain(`_${aboutHash}`)

      // Should also emit ja locale chunks
      const sharedJa = emitted.find((f) => f.fileName === '_fluenti/shared-ja.js')
      expect(sharedJa).toBeDefined()
      expect(sharedJa!.source).toContain(`_${welcomeHash}`)
    })

    it('does not emit when splitting is not per-route', () => {
      const dynamicPlugins = fluentiPlugin({
        splitting: 'dynamic',
        catalogDir: 'src/locales/compiled',
        sourceLocale: 'en',
        locales: ['en'],
        framework: 'vue',
      })
      const plugin = dynamicPlugins.find((p) => p.name === 'fluenti:build-split')!

      const emitted: any[] = []
      const generateContext = {
        emitFile: (file: any) => emitted.push(file),
      }

      if (plugin.generateBundle) {
        ;(plugin.generateBundle as any).call(generateContext, {}, {})
      }

      expect(emitted).toHaveLength(0)
    })

    it('handles all messages in a single chunk (no shared)', () => {
      const plugin = getBuildSplitPlugin()
      const mockContext = { environment: { mode: 'build' } }

      ;(plugin.transform as any).call(
        mockContext,
        `$t('Hello')`,
        'src/pages/home.vue?type=script',
      )

      const bundle: Record<string, any> = {
        'assets/home-x1y2z3.js': {
          type: 'chunk',
          modules: { 'src/pages/home.vue?type=script': {} },
        },
      }

      const emitted: any[] = []
      ;(plugin.generateBundle as any).call(
        { emitFile: (f: any) => emitted.push(f) },
        {},
        bundle,
      )

      // Route-specific chunk emitted
      const home = emitted.find((f) => f.fileName === '_fluenti/home-en.js')
      expect(home).toBeDefined()
      expect(home!.source).toContain(`_${hashMessage('Hello')}`)
    })
  })
})
