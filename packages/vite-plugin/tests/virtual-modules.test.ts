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
})

describe('loadVirtualSplitModule', () => {
  describe('runtime module (vue)', () => {
    it('generates reactive catalog with shallowReactive', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)

      expect(code).toContain('shallowReactive')
      expect(code).toContain('__defaultMsgs')
      expect(code).toContain('export { __catalog')
    })

    it('includes all locale loaders', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)!

      expect(code).toContain("'en': () => import(")
      expect(code).toContain("'fr': () => import(")
      expect(code).toContain("'ja': () => import(")
    })

    it('exports switchLocale and preloadLocale functions', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/runtime', defaultOptions)!

      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
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

    it('includes all locale loaders', () => {
      const code = loadVirtualSplitModule('\0virtual:fluenti/route-runtime', defaultOptions)!

      expect(code).toContain("'en': () => import(")
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

  it('returns undefined for unresolved IDs', () => {
    expect(loadVirtualSplitModule('unknown', defaultOptions)).toBeUndefined()
  })
})
