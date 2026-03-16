import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    expect(result.resolve.alias['@fluenti/next/__generated']).toBe(
      '/project/node_modules/.fluenti/server.js',
    )
  })
})
