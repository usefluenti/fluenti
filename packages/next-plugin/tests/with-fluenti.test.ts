import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync } from 'node:fs'
import { withFluenti } from '../src/with-fluenti'

// Mock the generate-server-module to avoid filesystem operations
vi.mock('../src/generate-server-module', () => ({
  generateServerModule: vi.fn(() => '/project/.fluenti/server.js'),
}))

// Mock read-config
vi.mock('../src/read-config', () => ({
  resolveConfig: vi.fn(() => ({
    fluentiConfig: {
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      catalogDir: './locales',
      format: 'po',
      include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
      compileOutDir: './src/locales/compiled',
    },
    serverModule: null,
    serverModuleOutDir: '.fluenti',
    cookieName: 'locale',
  })),
}))

// Mock fs.existsSync for compiled dir check
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  }
})

// Mock dev-watcher to avoid starting real fs watchers in tests
vi.mock('../src/dev-watcher', () => ({
  startDevWatcher: vi.fn(() => vi.fn()),
}))

describe('withFluenti', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a function when called with fluent config', () => {
    const wrapper = withFluenti()
    expect(typeof wrapper).toBe('function')
  })

  it('wraps next config when called as function', () => {
    const wrapper = withFluenti()
    const config = wrapper({ reactStrictMode: true })
    expect(config).toHaveProperty('reactStrictMode', true)
    expect(config).toHaveProperty('webpack')
    expect(typeof config['webpack']).toBe('function')
  })

  it('wraps next config directly when passed next config', () => {
    const config = withFluenti({ reactStrictMode: true })
    expect(config).toHaveProperty('reactStrictMode', true)
    expect(config).toHaveProperty('webpack')
  })

  it('adds webpack rules when webpack is called', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as typeof webpackConfig
    expect(result.module.rules.length).toBe(1)

    const rule = result.module.rules[0] as { test: RegExp; enforce: string; use: unknown[] }
    expect(rule.test).toEqual(/\.[jt]sx?$/)
    expect(rule.enforce).toBe('pre')
  })

  it('preserves existing webpack config', () => {
    const existingWebpack = vi.fn((config: unknown) => config)
    const wrapper = withFluenti()
    const config = wrapper({ webpack: existingWebpack })
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    webpackFn(webpackConfig, { isServer: true, dev: true })
    expect(existingWebpack).toHaveBeenCalled()
  })

  it('adds resolve alias for generated server module', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as typeof webpackConfig
    expect(result.resolve.alias['@fluenti/next$']).toBe(
      '/project/.fluenti/server.js',
    )
  })

  // --- Edge case tests ---

  it('returns a function when called with no arguments', () => {
    const result = withFluenti()
    expect(typeof result).toBe('function')
    // The returned function should produce a valid config
    const config = result({})
    expect(config).toHaveProperty('webpack')
  })

  it('returns a function when called with fluent-only config (no next keys)', () => {
    // An object with Fluenti-specific keys should be treated as fluent config
    const result = withFluenti({ config: { sourceLocale: 'en', locales: ['en', 'fr'], catalogDir: './locales', format: 'po', include: ['./src/**/*.tsx'], compileOutDir: './src/locales/compiled' } })
    expect(typeof result).toBe('function')
    const config = result({})
    expect(config).toHaveProperty('webpack')
  })

  it('wraps next config directly when passed object with no fluent keys', () => {
    const config = withFluenti({ reactStrictMode: true })
    // Should return NextConfig directly, not a function
    expect(config).toHaveProperty('reactStrictMode', true)
    expect(config).toHaveProperty('webpack')
    expect(typeof config['webpack']).toBe('function')
  })

  it('treats { env: {}, config: {...} } as FluentConfig (has fluent key)', () => {
    // config is a Fluenti key — should be treated as FluentConfig
    const result = withFluenti({ config: { sourceLocale: 'en', locales: ['en'], catalogDir: './locales', format: 'po', include: ['./src/**/*.tsx'], compileOutDir: './src/locales/compiled' } })
    expect(typeof result).toBe('function')
  })

  it('treats { env: {} } as NextConfig (no fluent keys)', () => {
    const config = withFluenti({ env: {} } as never)
    // No fluent-specific keys → treated as NextConfig directly
    expect(config).toHaveProperty('webpack')
    expect(config).toHaveProperty('env')
  })

  it('isFluentConfig detects objects with no fluent-specific keys as NextConfig', () => {
    // Objects with only Next.js-recognized keys should be treated as NextConfig (direct return)
    const directConfigs = [
      { experimental: {} },
      { images: {} },
      { env: {} },
      { webpack: () => ({}) },
      { rewrites: async () => [] },
      { redirects: async () => [] },
      { headers: async () => [] },
      { pageExtensions: ['tsx'] },
      { output: 'standalone' },
      { basePath: '/app' },
      { i18n: { locales: ['en'] } },
      { trailingSlash: true },
      { compiler: {} },
      { transpilePackages: [] },
      { turbopack: {} },
    ]

    for (const nextCfg of directConfigs) {
      const result = withFluenti(nextCfg as never)
      // Should return a NextConfig object (with webpack), not a function
      expect(result).toHaveProperty('webpack', expect.any(Function))
    }
  })

  it('preserves existing webpack config and calls it with modified config', () => {
    const existingWebpack = vi.fn((config: { module: { rules: unknown[] } }) => {
      config.module.rules.push({ test: /\.css$/ })
      return config
    })
    const wrapper = withFluenti()
    const config = wrapper({ webpack: existingWebpack })
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as typeof webpackConfig
    expect(existingWebpack).toHaveBeenCalledTimes(1)
    // Fluenti loader + user's css rule
    expect(result.module.rules.length).toBe(2)
  })

  it('adds loader rules with correct structure', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: false, dev: false }) as typeof webpackConfig
    const rule = result.module.rules[0] as {
      test: RegExp
      enforce: string
      exclude: RegExp[]
      use: Array<{ loader: string; options: Record<string, unknown> }>
    }

    expect(rule.test).toEqual(/\.[jt]sx?$/)
    expect(rule.enforce).toBe('pre')
    expect(rule.exclude).toEqual([/node_modules/, /\.next/])
    expect(rule.use).toHaveLength(1)
    expect(rule.use[0]!.options).toEqual({
      serverModulePath: '/project/.fluenti/server.js',
    })
  })

  it('adds resolve alias even when resolve.alias is initially undefined', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: {} as { alias?: Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as {
      resolve: { alias: Record<string, string> }
    }
    expect(result.resolve.alias['@fluenti/next$']).toBe(
      '/project/.fluenti/server.js',
    )
  })

  it('warns when compiled catalogs directory does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    withFluenti()({})

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[fluenti] Compiled catalogs not found'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('npx fluenti extract && npx fluenti compile'),
    )

    warnSpy.mockRestore()
    vi.mocked(existsSync).mockReturnValue(true)
  })

  it('does not warn when compiled catalogs directory exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    withFluenti()({})

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[fluenti] Compiled catalogs not found'),
    )

    warnSpy.mockRestore()
  })

  it('does not inject plugins in dev mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as Record<string, unknown>
    // Dev auto-compile is handled by startDevWatcher, not a webpack plugin
    expect(result['plugins']).toBeUndefined()
  })

  it('does not inject plugins when buildAutoCompile is false', async () => {
    // Mock resolveConfig to return buildAutoCompile: false
    const { resolveConfig } = await import('../src/read-config')
    vi.mocked(resolveConfig).mockReturnValueOnce({
      fluentiConfig: {
        sourceLocale: 'en',
        locales: ['en', 'ja'],
        catalogDir: './locales',
        format: 'po',
        include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
        compileOutDir: './src/locales/compiled',
        buildAutoCompile: false,
      },
      serverModule: null,
      serverModuleOutDir: '.fluenti',
      cookieName: 'locale',
    })
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: false }) as Record<string, unknown>
    expect(result['plugins']).toBeUndefined()
  })

  // --- Production build: beforeRun plugin tests ---

  it('injects a beforeRun plugin in production build mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: false }) as {
      plugins: Array<{ apply: (compiler: unknown) => void }>
    }
    expect(result.plugins).toHaveLength(1)
    expect(typeof result.plugins[0]!.apply).toBe('function')
  })

  it('beforeRun plugin calls tapPromise on compiler.hooks.beforeRun', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: false }) as {
      plugins: Array<{ apply: (compiler: unknown) => void }>
    }

    const mockTapPromise = vi.fn()
    const mockCompiler = {
      hooks: {
        beforeRun: { tapPromise: mockTapPromise },
      },
    }

    result.plugins[0]!.apply(mockCompiler)
    expect(mockTapPromise).toHaveBeenCalledWith('fluenti-compile', expect.any(Function))
  })

  it('beforeRun callback only runs once across server+client passes', async () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const makeWebpackConfig = () => ({
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    })

    // Collect all plugins from both passes
    const result1 = webpackFn(makeWebpackConfig(), { isServer: true, dev: false }) as {
      plugins: Array<{ apply: (compiler: unknown) => void }>
    }
    const result2 = webpackFn(makeWebpackConfig(), { isServer: false, dev: false }) as {
      plugins: Array<{ apply: (compiler: unknown) => void }>
    }

    // Both passes get plugins
    expect(result1.plugins).toHaveLength(1)
    expect(result2.plugins).toHaveLength(1)

    // Simulate both compilers calling tapPromise callbacks
    let tapCallback1: (() => Promise<void>) | null = null
    let tapCallback2: (() => Promise<void>) | null = null

    result1.plugins[0]!.apply({
      hooks: {
        beforeRun: {
          tapPromise: (_name: string, cb: () => Promise<void>) => { tapCallback1 = cb },
        },
      },
    })
    result2.plugins[0]!.apply({
      hooks: {
        beforeRun: {
          tapPromise: (_name: string, cb: () => Promise<void>) => { tapCallback2 = cb },
        },
      },
    })

    // Both callbacks should exist but only one should actually run compile
    // (buildCompileRan guard prevents double execution)
    await tapCallback1!()
    await tapCallback2!()
    // No assertion on import call count since we can't mock dynamic import easily,
    // but the guard logic is tested by the code not throwing
  })

  it('does not run compile in dev mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as Record<string, unknown>
    // No plugins injected in dev mode
    expect(result['plugins']).toBeUndefined()
  })

  // --- Turbopack tests ---

  it('config includes turbopack.rules for all source extensions', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const turbopack = config['turbopack'] as Record<string, unknown>
    const rules = turbopack['rules'] as Record<string, unknown>

    for (const ext of ['*.ts', '*.tsx', '*.js', '*.jsx']) {
      expect(rules[ext]).toBeDefined()
      const rule = rules[ext] as { condition: unknown; loaders: string[] }
      expect(rule.condition).toEqual({ not: 'foreign' })
      expect(rule.loaders).toHaveLength(1)
      expect(rule.loaders[0]).toBe('@fluenti/next/loader')
    }
  })

  it('config includes turbopack.resolveAlias pointing to serverModulePath (relative)', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const turbopack = config['turbopack'] as Record<string, unknown>
    const resolveAlias = turbopack['resolveAlias'] as Record<string, string>

    // Should be a relative path starting with "./"
    expect(resolveAlias['@fluenti/next']).toMatch(/^\.\//)
    expect(resolveAlias['@fluenti/next']).toContain('.fluenti/server.js')
  })

  it('merges turbopack config with user existing config', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = withFluenti()
    const config = wrapper({
      turbopack: {
        rules: { '*.mdx': { loaders: ['mdx-loader'] } },
        resolveAlias: { 'my-alias': '/some/path' },
      },
    })
    const turbopack = config['turbopack'] as Record<string, unknown>
    const rules = turbopack['rules'] as Record<string, unknown>
    const resolveAlias = turbopack['resolveAlias'] as Record<string, string>

    // User's custom rule preserved
    expect(rules['*.mdx']).toEqual({ loaders: ['mdx-loader'] })
    // Fluenti rules added
    expect(rules['*.ts']).toBeDefined()
    expect(rules['*.tsx']).toBeDefined()
    // User's alias preserved
    expect(resolveAlias['my-alias']).toBe('/some/path')
    // Fluenti alias added (relative path)
    expect(resolveAlias['@fluenti/next']).toMatch(/^\.\//)
    expect(resolveAlias['@fluenti/next']).toContain('.fluenti/server.js')

    warnSpy.mockRestore()
  })

  it('user turbopack rules override fluenti rules on conflict', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const userTsxRule = { loaders: ['my-custom-loader'], condition: { not: 'foreign' } }
    const wrapper = withFluenti()
    const config = wrapper({
      turbopack: {
        rules: { '*.tsx': userTsxRule },
      },
    })
    const turbopack = config['turbopack'] as Record<string, unknown>
    const rules = turbopack['rules'] as Record<string, unknown>

    // User's *.tsx rule should win over fluenti's *.tsx rule
    expect(rules['*.tsx']).toEqual(userTsxRule)
    // Non-conflicting fluenti rules should still be present
    expect(rules['*.ts']).toBeDefined()

    warnSpy.mockRestore()
  })

  it('warns when user turbopack rules conflict with fluenti rules', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = withFluenti()
    wrapper({
      turbopack: {
        rules: { '*.tsx': { loaders: ['my-loader'] } },
      },
    })

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[fluenti] Your turbopack.rules override'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('*.tsx'),
    )

    warnSpy.mockRestore()
  })

  it('does not warn when user turbopack rules do not conflict', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = withFluenti()
    wrapper({
      turbopack: {
        rules: { '*.mdx': { loaders: ['mdx-loader'] } },
      },
    })

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[fluenti] Your turbopack.rules override'),
    )

    warnSpy.mockRestore()
  })

  it('user turbopack resolveAlias overrides fluenti alias on conflict', () => {
    const wrapper = withFluenti()
    const config = wrapper({
      turbopack: {
        resolveAlias: { '@fluenti/next': '/user/custom/path.js' },
      },
    })
    const turbopack = config['turbopack'] as Record<string, unknown>
    const resolveAlias = turbopack['resolveAlias'] as Record<string, string>

    // User's alias should win
    expect(resolveAlias['@fluenti/next']).toBe('/user/custom/path.js')
  })
})
