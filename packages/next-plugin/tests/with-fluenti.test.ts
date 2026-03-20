import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { withFluenti } from '../src/with-fluenti'

// Mock the generate-server-module to avoid filesystem operations
vi.mock('../src/generate-server-module', () => ({
  generateServerModule: vi.fn(() => '/project/node_modules/.fluenti/server.js'),
}))

// Mock read-config
vi.mock('../src/read-config', () => ({
  resolveConfig: vi.fn(() => ({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    compiledDir: './src/locales/compiled',
    serverModule: null,
    serverModuleOutDir: 'node_modules/.fluenti',
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

// Mock child_process.execSync for build auto-compile
vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return {
    ...actual,
    execSync: vi.fn(),
  }
})

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
      '/project/node_modules/.fluenti/server.js',
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
    // An object with no Next.js-recognized keys should be treated as fluent config
    const result = withFluenti({ locales: ['en', 'fr'] } as never)
    expect(typeof result).toBe('function')
    const config = result({})
    expect(config).toHaveProperty('webpack')
  })

  it('wraps next config directly when passed object with recognized next keys', () => {
    const config = withFluenti({ reactStrictMode: true })
    // Should return NextConfig directly, not a function
    expect(config).toHaveProperty('reactStrictMode', true)
    expect(config).toHaveProperty('webpack')
    expect(typeof config['webpack']).toBe('function')
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
      serverModulePath: '/project/node_modules/.fluenti/server.js',
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
      '/project/node_modules/.fluenti/server.js',
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

  it('injects fluenti-dev webpack plugin in dev mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
      plugins: [] as unknown[],
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as typeof webpackConfig
    // Should have the fluenti-dev plugin injected
    expect(result.plugins.length).toBe(1)
    expect(result.plugins[0]).toHaveProperty('apply', expect.any(Function))
  })

  it('does not inject fluenti-dev plugin in production mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: false }) as Record<string, unknown>
    // plugins should not exist or be empty
    expect(result['plugins']).toBeUndefined()
  })

  it('does not inject fluenti-dev plugin when devAutoCompile is false', () => {
    const wrapper = withFluenti({ devAutoCompile: false } as never)
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    const result = webpackFn(webpackConfig, { isServer: true, dev: true }) as Record<string, unknown>
    expect(result['plugins']).toBeUndefined()
  })

  it('runs extract+compile in production build mode', () => {
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    webpackFn(webpackConfig, { isServer: true, dev: false })

    expect(vi.mocked(execSync)).toHaveBeenCalledWith(
      'node_modules/.bin/fluenti compile',
      expect.objectContaining({ stdio: 'inherit' }),
    )
  })

  it('runs extract+compile only once across server+client passes', () => {
    vi.mocked(execSync).mockClear()
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const makeWebpackConfig = () => ({
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    })

    // First call (server)
    webpackFn(makeWebpackConfig(), { isServer: true, dev: false })
    // Second call (client)
    webpackFn(makeWebpackConfig(), { isServer: false, dev: false })

    expect(vi.mocked(execSync)).toHaveBeenCalledTimes(1)
  })

  it('does not run extract+compile in production when buildAutoCompile is false', () => {
    vi.mocked(execSync).mockClear()
    const wrapper = withFluenti({ buildAutoCompile: false } as never)
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
    }

    webpackFn(webpackConfig, { isServer: true, dev: false })

    expect(vi.mocked(execSync)).not.toHaveBeenCalled()
  })

  it('does not run extract+compile in dev mode', () => {
    vi.mocked(execSync).mockClear()
    const wrapper = withFluenti()
    const config = wrapper({})
    const webpackFn = config['webpack'] as (cfg: unknown, opts: unknown) => unknown

    const webpackConfig = {
      module: { rules: [] as unknown[] },
      resolve: { alias: {} as Record<string, string> },
      plugins: [] as unknown[],
    }

    webpackFn(webpackConfig, { isServer: true, dev: true })

    expect(vi.mocked(execSync)).not.toHaveBeenCalled()
  })

  it('isNextConfig detects objects with next-specific keys', () => {
    // Objects with recognized Next.js keys should be treated as NextConfig
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
    ]

    for (const nextCfg of directConfigs) {
      const result = withFluenti(nextCfg as never)
      // Should return a NextConfig object (with webpack), not a function
      expect(result).toHaveProperty('webpack', expect.any(Function))
    }
  })
})
