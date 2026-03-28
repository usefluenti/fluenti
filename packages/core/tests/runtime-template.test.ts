import { describe, it, expect } from 'vitest'
import { createRuntimeGenerator } from '../src/runtime-template'
import type { RuntimePrimitives, RuntimeGeneratorOptions } from '../src/runtime-template'

const mockPrimitives: RuntimePrimitives = {
  imports: "import { ref, shallowReactive } from 'vue'",
  catalogInit: 'const __catalog = shallowReactive({ ...__defaultMsgs })',
  localeInit: (defaultLocale: string) => `const __currentLocale = ref('${defaultLocale}')`,
  loadingInit: 'const __loading = ref(false)',
  catalogUpdate: (msgs: string) => `Object.assign(__catalog, ${msgs})`,
  localeUpdate: (locale: string) => `__currentLocale.value = ${locale}`,
  loadingUpdate: (value: string) => `__loading.value = ${value}`,
  localeRead: '__currentLocale.value',
  runtimeKey: 'fluenti.runtime.vue.v1',
}

const baseOptions: RuntimeGeneratorOptions = {
  rootDir: '/app',
  catalogDir: 'locales/compiled',
  catalogExtension: '.js',
  locales: ['en', 'ja', 'zh-CN'],
  sourceLocale: 'en',
  defaultBuildLocale: 'en',
}

describe('createRuntimeGenerator', () => {
  it('returns an object with generateRuntime and generateRouteRuntime', () => {
    const generator = createRuntimeGenerator(mockPrimitives)
    expect(generator).toHaveProperty('generateRuntime')
    expect(generator).toHaveProperty('generateRouteRuntime')
    expect(typeof generator.generateRuntime).toBe('function')
    expect(typeof generator.generateRouteRuntime).toBe('function')
  })

  describe('generateRuntime', () => {
    it('generates valid runtime code with imports', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain("import { ref, shallowReactive } from 'vue'")
      expect(code).toContain("import __defaultMsgs from '/app/locales/compiled/en.js'")
    })

    it('generates locale loaders for non-default locales', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain("'ja': () => import('/app/locales/compiled/ja.js')")
      expect(code).toContain("'zh-CN': () => import('/app/locales/compiled/zh-CN.js')")
      // Default locale should not be in loaders
      expect(code).not.toContain("'en': () => import")
    })

    it('generates __switchLocale function', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('async function __switchLocale(locale)')
      expect(code).toContain('__loadedLocales.has(locale)')
    })

    it('generates __preloadLocale function', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('async function __preloadLocale(locale)')
    })

    it('registers runtime on globalThis', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain("Symbol.for('fluenti.runtime.vue.v1')")
      expect(code).toContain('{ __switchLocale, __preloadLocale }')
    })

    it('exports expected symbols', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('export { __catalog, __switchLocale, __preloadLocale, __currentLocale, __loading, __loadedLocales }')
    })

    it('uses sourceLocale as fallback when defaultBuildLocale is empty', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime({
        ...baseOptions,
        defaultBuildLocale: '',
      })

      expect(code).toContain("import __defaultMsgs from '/app/locales/compiled/en.js'")
      expect(code).toContain("new Set(['en'])")
    })

    it('uses default .js extension when catalogExtension is empty', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime({
        ...baseOptions,
        catalogExtension: '',
      })

      expect(code).toContain('/app/locales/compiled/en.js')
    })

    it('includes catalog init and loading init from primitives', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('const __catalog = shallowReactive({ ...__defaultMsgs })')
      expect(code).toContain('const __loading = ref(false)')
      expect(code).toContain("const __currentLocale = ref('en')")
    })
  })

  describe('generateRouteRuntime', () => {
    it('generates valid route runtime code', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRouteRuntime(baseOptions)

      expect(code).toContain("import { ref, shallowReactive } from 'vue'")
      expect(code).toContain("import __defaultMsgs from '/app/locales/compiled/en.js'")
    })

    it('generates route-specific functions', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRouteRuntime(baseOptions)

      expect(code).toContain('function __registerRouteLoader(routeId, locale, loader)')
      expect(code).toContain('async function __loadRoute(routeId, locale)')
    })

    it('exports route-specific symbols', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRouteRuntime(baseOptions)

      expect(code).toContain('export { __catalog, __switchLocale, __preloadLocale, __loadRoute, __registerRouteLoader, __currentLocale, __loading, __loadedLocales }')
    })

    it('uses catalogMerge when provided', () => {
      const primitivesWithMerge: RuntimePrimitives = {
        ...mockPrimitives,
        catalogMerge: (msgs: string) => `Object.assign(__catalog, ${msgs})`,
      }
      const generator = createRuntimeGenerator(primitivesWithMerge)
      const code = generator.generateRouteRuntime(baseOptions)

      // The __loadRoute function should use catalogMerge
      expect(code).toContain('Object.assign(__catalog,')
    })

    it('falls back to catalogUpdate when catalogMerge is not provided', () => {
      const primitivesNoMerge: RuntimePrimitives = {
        ...mockPrimitives,
        catalogMerge: undefined,
      }
      const generator = createRuntimeGenerator(primitivesNoMerge)
      const code = generator.generateRouteRuntime(baseOptions)

      expect(code).toContain('Object.assign(__catalog,')
    })

    it('uses sourceLocale as fallback when defaultBuildLocale is empty', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRouteRuntime({
        ...baseOptions,
        defaultBuildLocale: '',
      })

      expect(code).toContain("import __defaultMsgs from '/app/locales/compiled/en.js'")
    })

    it('uses default .js extension when catalogExtension is empty', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRouteRuntime({
        ...baseOptions,
        catalogExtension: '',
      })

      expect(code).toContain('/app/locales/compiled/en.js')
    })
  })
})
