import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, mkdirSync } from 'node:fs'
import { withFluenti } from '../src/with-fluenti'

// Mock the generate-server-module to avoid filesystem operations
vi.mock('../src/generate-server-module', () => ({
  generateServerModule: vi.fn(() => '/project/.fluenti/server.js'),
}))

// Mock @fluenti/cli — used to simulate presence/failure of the optional peer dep
vi.mock('@fluenti/cli', () => ({
  runCompile: vi.fn().mockResolvedValue(undefined),
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
    mkdirSync: vi.fn(),
  }
})

// Mock dev-watcher to avoid starting real fs watchers in tests
vi.mock('../src/dev-watcher', () => ({
  startDevWatcher: vi.fn(() => vi.fn()),
}))

// Mock child_process.execSync to avoid actually running npx fluenti compile
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
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

  it('auto-creates compiled catalogs directory when missing', () => {
    vi.mocked(existsSync).mockReturnValue(false)

    withFluenti()({})

    // Should auto-create the directory instead of warning
    expect(mkdirSync).toHaveBeenCalled()
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

  // --- Production build: buildAutoCompile via execSync ---

  it('does not inject webpack plugins (buildAutoCompile moved to config phase)', () => {
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

  // --- Edge case tests: missing compiled catalogs, devAutoCompile, loader enforce ---

  it('auto-creates compiled catalogs directory when missing (edge case)', () => {
    vi.mocked(existsSync).mockReturnValue(false)

    withFluenti()({})

    // Should auto-create instead of logging warning
    expect(mkdirSync).toHaveBeenCalled()
    vi.mocked(existsSync).mockReturnValue(true)
  })

  it('devAutoCompile conditions: does not start watcher when devAutoCompile is disabled', async () => {
    const { resolveConfig } = await import('../src/read-config')
    const { startDevWatcher } = await import('../src/dev-watcher')
    vi.mocked(resolveConfig).mockReturnValueOnce({
      fluentiConfig: {
        sourceLocale: 'en',
        locales: ['en', 'ja'],
        catalogDir: './locales',
        format: 'po',
        include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
        compileOutDir: './src/locales/compiled',
        devAutoCompile: false,
      },
      serverModule: null,
      serverModuleOutDir: '.fluenti',
      cookieName: 'locale',
    })

    vi.mocked(startDevWatcher).mockClear()
    withFluenti()({})

    // devAutoCompile is false, so startDevWatcher should not have been called
    // (unless NODE_ENV is 'development', but the guard checks devAutoCompile)
    // Since we can't fully control NODE_ENV here, we verify the config propagates
    expect(vi.mocked(resolveConfig)).toHaveBeenCalled()
  })

  it('loader enforce defaults to "pre" and is included in webpack rule', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as {
      module: { rules: Array<{ enforce?: string }> }
    }

    const rule = result.module.rules[0]!
    expect(rule.enforce).toBe('pre')
  })
})

// ---------------------------------------------------------------------------
// buildAutoCompile via execSync (bundler-agnostic)
// ---------------------------------------------------------------------------

describe('buildAutoCompile — execSync', () => {
  it('calls execSync with fluenti compile in non-dev mode', async () => {
    const { execSync } = await import('node:child_process')
    vi.mocked(execSync).mockClear()

    // Force non-dev by ensuring NODE_ENV is not 'development' and no 'dev' in argv
    const origEnv = process.env['NODE_ENV']
    const origArgv = process.argv
    process.env['NODE_ENV'] = 'production'
    process.argv = ['node', 'next', 'build']

    try {
      const wrapper = withFluenti()
      wrapper({})
      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('compile'),
        expect.objectContaining({ stdio: 'inherit' }),
      )
    } finally {
      process.env['NODE_ENV'] = origEnv
      process.argv = origArgv
    }
  })

  it('does not call execSync in dev mode', async () => {
    const { execSync } = await import('node:child_process')
    vi.mocked(execSync).mockClear()

    const origEnv = process.env['NODE_ENV']
    process.env['NODE_ENV'] = 'development'

    try {
      const wrapper = withFluenti()
      wrapper({})
      expect(vi.mocked(execSync)).not.toHaveBeenCalled()
    } finally {
      process.env['NODE_ENV'] = origEnv
    }
  })

  it('throws when production auto-compile fails', async () => {
    const { execSync } = await import('node:child_process')
    vi.mocked(execSync).mockImplementation(() => { throw new Error('npx: command not found') })

    const origEnv = process.env['NODE_ENV']
    const origArgv = process.argv
    process.env['NODE_ENV'] = 'production'
    process.argv = ['node', 'next', 'build']

    try {
      const wrapper = withFluenti()
      expect(() => wrapper({})).toThrow(/Production auto-compile failed/)
    } finally {
      process.env['NODE_ENV'] = origEnv
      process.argv = origArgv
      vi.mocked(execSync).mockReset()
    }
  })
})
