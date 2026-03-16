import { describe, it, expect } from 'vitest'
import { withFluenti } from '../src/index'

describe('withFluenti', () => {
  it('returns a function that wraps next config', () => {
    const wrapper = withFluenti({ locales: ['en', 'ja'] })
    expect(typeof wrapper).toBe('function')
  })

  it('preserves existing next config properties', () => {
    const wrapper = withFluenti({ locales: ['en'] })
    const config = wrapper({ reactStrictMode: true, images: { domains: ['example.com'] } })

    expect(config.reactStrictMode).toBe(true)
    expect(config.images).toEqual({ domains: ['example.com'] })
  })

  it('adds webpack config with fluenti loader', () => {
    const wrapper = withFluenti({ locales: ['en'] })
    const config = wrapper({})

    expect(typeof config.webpack).toBe('function')

    // Simulate webpack config call
    const mockWebpackConfig = {
      module: { rules: [] },
    }
    const result = config.webpack(mockWebpackConfig, { dev: false, isServer: false })

    expect(result.module.rules.length).toBe(1)
    expect(result.module.rules[0].test).toEqual(/\.(tsx|jsx|ts|js)$/)
    expect(result.module.rules[0].exclude).toEqual(/node_modules/)
  })

  it('chains with existing webpack config', () => {
    const customWebpack = (config: any) => {
      config.custom = true
      return config
    }

    const wrapper = withFluenti({ locales: ['en'] })
    const config = wrapper({ webpack: customWebpack })

    const mockWebpackConfig = {
      module: { rules: [] },
    }
    const result = config.webpack(mockWebpackConfig, { dev: false, isServer: false })

    expect(result.custom).toBe(true)
    expect(result.module.rules.length).toBe(1)
  })

  it('adds turbopack rules for loader', () => {
    const wrapper = withFluenti({ locales: ['en'] })
    const config = wrapper({})

    expect(config.turbopack?.rules).toBeDefined()
    expect(config.turbopack.rules['*.tsx']).toBeDefined()
    expect(config.turbopack.rules['*.jsx']).toBeDefined()
    expect(config.turbopack.rules['*.ts']).toBeDefined()
    expect(config.turbopack.rules['*.js']).toBeDefined()
  })

  it('merges with existing turbopack config', () => {
    const wrapper = withFluenti({ locales: ['en'] })
    const config = wrapper({
      turbopack: { rules: { '*.mdx': { loaders: ['mdx-loader'] } } },
    })

    // Existing rules are preserved
    expect(config.turbopack?.rules?.['*.mdx']).toBeDefined()
    // Fluenti rules are added
    expect(config.turbopack?.rules?.['*.tsx']).toBeDefined()
  })

  it('uses default options when none provided', () => {
    const wrapper = withFluenti()
    const config = wrapper({})

    expect(typeof config.webpack).toBe('function')
  })
})
