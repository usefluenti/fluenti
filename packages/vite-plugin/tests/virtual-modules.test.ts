import { describe, it, expect } from 'vitest'
import { resolveVirtualSplitId, loadVirtualSplitModule } from '../src/virtual-modules'
import type { VirtualModuleOptions } from '../src/virtual-modules'

const defaultOptions: VirtualModuleOptions = {
  catalogDir: 'src/locales/compiled',
  locales: ['en', 'fr', 'ja'],
  sourceLocale: 'en',
  defaultBuildLocale: 'en',
  framework: 'vue',
}

describe('resolveVirtualSplitId', () => {
  it('resolves virtual:fluenti/runtime', () => {
    expect(resolveVirtualSplitId('virtual:fluenti/runtime')).toBe('\0virtual:fluenti/runtime')
  })

  it('resolves virtual:fluenti/messages', () => {
    expect(resolveVirtualSplitId('virtual:fluenti/messages')).toBe('\0virtual:fluenti/messages')
  })

  it('resolves virtual:fluenti/route-runtime', () => {
    expect(resolveVirtualSplitId('virtual:fluenti/route-runtime')).toBe('\0virtual:fluenti/route-runtime')
  })

  it('returns undefined for unrelated IDs', () => {
    expect(resolveVirtualSplitId('some-other-module')).toBeUndefined()
    expect(resolveVirtualSplitId('virtual:fluenti/messages/en')).toBeUndefined()
  })

  it('returns undefined for unknown virtual:fluenti/* sub-paths', () => {
    expect(resolveVirtualSplitId('virtual:fluenti/unknown')).toBeUndefined()
    expect(resolveVirtualSplitId('virtual:fluenti/')).toBeUndefined()
    expect(resolveVirtualSplitId('virtual:other/runtime')).toBeUndefined()
  })
})

describe('loadVirtualSplitModule', () => {
  describe('runtime module (vue)', () => {
    it('generates reactive catalog with shallowReactive', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)

      expect(code).toContain('shallowReactive')
      expect(code).toContain('__defaultMsgs')
      expect(code).toContain('export { __catalog')
    })

    it('includes only non-default locale loaders', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)!

      expect(code).not.toContain("'en': () => import(")
      expect(code).toContain("'fr': () => import(")
      expect(code).toContain("'ja': () => import(")
    })

    it('exports switchLocale and preloadLocale functions', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)!

      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
      expect(code).toContain("globalThis[Symbol.for('fluenti.runtime.vue')]")
    })

    it('exports loading state', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)!

      expect(code).toContain('__loading')
      expect(code).toContain('__loadedLocales')
    })
  })

  describe('runtime module (solid)', () => {
    it('generates Solid store-based catalog', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', {
        ...defaultOptions,
        framework: 'solid',
      })

      expect(code).toContain('createStore')
      expect(code).toContain('createSignal')
      expect(code).not.toContain('shallowReactive')
    })
  })

  describe('static messages module', () => {
    it('re-exports from default locale file', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/messages', defaultOptions)

      expect(code).toContain("export * from")
      expect(code).toContain('/en.js')
    })

    it('uses defaultBuildLocale when specified', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/messages', {
        ...defaultOptions,
        defaultBuildLocale: 'fr',
      })

      expect(code).toContain('/fr.js')
    })
  })

  describe('route runtime module (vue)', () => {
    it('generates reactive catalog with shallowReactive', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', defaultOptions)

      expect(code).toContain('shallowReactive')
      expect(code).toContain('__defaultMsgs')
      expect(code).toContain('export { __catalog')
    })

    it('exports route-specific functions', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', defaultOptions)!

      expect(code).toContain('__loadRoute')
      expect(code).toContain('__registerRouteLoader')
      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
    })

    it('includes only non-default locale loaders', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', defaultOptions)!

      expect(code).not.toContain("'en': () => import(")
      expect(code).toContain("'fr': () => import(")
      expect(code).toContain("'ja': () => import(")
    })
  })

  describe('route runtime module (solid)', () => {
    it('generates Solid store-based catalog', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', {
        ...defaultOptions,
        framework: 'solid',
      })

      expect(code).toContain('createStore')
      expect(code).toContain('createSignal')
      expect(code).toContain('__loadRoute')
      expect(code).not.toContain('shallowReactive')
    })
  })

  describe('runtime module (react)', () => {
    it('generates mutable catalog without framework reactivity', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', {
        ...defaultOptions,
        framework: 'react',
      })

      expect(code).toContain('__catalog')
      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
      expect(code).not.toContain('shallowReactive')
      expect(code).not.toContain('createStore')
    })

    it('includes only non-default locale loaders for React', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', {
        ...defaultOptions,
        framework: 'react',
      })!

      expect(code).not.toContain("'en': () => import(")
      expect(code).toContain("'fr': () => import(")
      expect(code).toContain("'ja': () => import(")
      expect(code).toContain("globalThis[Symbol.for('fluenti.runtime.react')]")
    })
  })

  describe('static messages module — edge cases', () => {
    it('generates re-export from default locale', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/messages', defaultOptions)!

      expect(code).toContain('export *')
      expect(code).toContain('/en.js')
    })
  })

  describe('route runtime module — edge cases', () => {
    it('Vue route runtime includes route-specific exports', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', defaultOptions)!

      expect(code).toContain('__loadRoute')
      expect(code).toContain('__registerRouteLoader')
      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
      expect(code).toContain('shallowReactive')
    })

    it('Solid route runtime uses createStore', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', {
        ...defaultOptions,
        framework: 'solid',
      })!

      expect(code).toContain('createStore')
      expect(code).toContain('__loadRoute')
      expect(code).toContain('__registerRouteLoader')
    })
  })

  describe('generated module content', () => {
    it('runtime module contains correct import paths for catalog directory', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', {
        ...defaultOptions,
        catalogDir: 'custom/path/compiled',
      })!

      expect(code).toContain('custom/path/compiled')
      expect(code).toContain('/en.js')
    })

    it('runtime module contains loader entries for non-default configured locales', () => {
      const locales = ['en', 'fr', 'ja', 'de', 'es']
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', {
        ...defaultOptions,
        locales,
      })!

      expect(code).not.toContain("'en': () => import(")
      for (const locale of locales.filter((locale) => locale !== 'en')) {
        expect(code).toContain(`'${locale}': () => import(`)
      }
    })
  })

  it('returns undefined for unresolved IDs', () => {
    expect(loadVirtualSplitModule('unknown', defaultOptions)).toBeUndefined()
  })
})
