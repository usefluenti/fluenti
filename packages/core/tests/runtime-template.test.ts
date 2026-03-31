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
  it('returns an object with generateRuntime', () => {
    const generator = createRuntimeGenerator(mockPrimitives)
    expect(generator).toHaveProperty('generateRuntime')
    expect(typeof generator.generateRuntime).toBe('function')
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

    it('escapes quotes in generated import specifiers and normalizes backslashes', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime({
        ...baseOptions,
        rootDir: "/app's",
        catalogDir: 'locales\\compiled',
      })

      expect(code).toContain("import __defaultMsgs from '/app\\'s/locales/compiled/en.js'")
      expect(code).toContain("'ja': () => import('/app\\'s/locales/compiled/ja.js')")
      expect(code).not.toContain("import __defaultMsgs from '/app's")
    })
  })

  describe('__switchLocale guards', () => {
    it('includes locale validation guard before loading', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain("if (!__loaders[locale])")
      expect(code).toContain("console.warn('[fluenti] No loader for locale:', locale)")
    })

    it('includes race condition protection with switchId', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('let __switchId = 0')
      expect(code).toContain('const thisId = ++__switchId')
      expect(code).toContain('if (thisId !== __switchId) return')
    })

    it('only resets loading for current request', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('if (thisId === __switchId)')
      expect(code).toContain('__loading.value = false')
    })

    it('includes error logging on import failure', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain("console.warn('[fluenti] locale switch failed:', locale, e)")
    })
  })

  describe('__preloadLocale dedup', () => {
    it('includes __preloadPromises Map for concurrent dedup', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('const __preloadPromises = new Map()')
      expect(code).toContain('if (__preloadPromises.has(locale)) return __preloadPromises.get(locale)')
      expect(code).toContain('__preloadPromises.set(locale, p)')
    })

    it('cleans up __preloadPromises in finally block', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('__preloadPromises.delete(locale)')
      expect(code).toContain('finally')
    })

    it('still checks __loadedLocales and __loaders before preloading', () => {
      const generator = createRuntimeGenerator(mockPrimitives)
      const code = generator.generateRuntime(baseOptions)

      expect(code).toContain('if (__loadedLocales.has(locale) || !__loaders[locale]) return')
    })
  })
})
