import { describe, expect, it } from 'vitest'
import type { Plugin } from 'vite'
import fluentiSolid from '../src/vite-plugin'

function callHook(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  const fn = typeof hook === 'function'
    ? hook
    : (hook as { handler?: (...hookArgs: unknown[]) => unknown } | undefined)?.handler
  return fn?.call(thisArg, ...args)
}

describe('fluentiSolid', () => {
  it('returns the expected plugin pipeline', () => {
    const plugins = fluentiSolid()
    const names = plugins.map((p) => p.name)
    expect(names).toContain('fluenti:virtual')
    expect(names).toContain('fluenti:script-transform')
    expect(names).toContain('fluenti:build-split')
    expect(names).toContain('fluenti:dev')
    // Should NOT contain vue-template or solid-jsx
    expect(names).not.toContain('fluenti:vue-template')
    expect(names).not.toContain('fluenti:solid-jsx')
  })

  describe('virtual modules with solid runtime', () => {
    it('generates Solid runtime with createStore when splitting is enabled', () => {
      const plugins = fluentiSolid({ config: { splitting: 'dynamic', sourceLocale: 'en', locales: ['en', 'fr'], compileOutDir: 'compiled', catalogDir: './locales', format: 'po', include: ['./src/**/*.{tsx,jsx,ts,js}'] } })
      const virtual = plugins.find((p) => p.name === 'fluenti:virtual') as Plugin

      const resolved = callHook(virtual.resolveId, {}, 'virtual:fluenti/runtime')
      expect(resolved).toBe('\0virtual:fluenti/runtime')

      const code = callHook(virtual.load, {}, '\0virtual:fluenti/runtime') as string
      expect(code).toContain('createStore')
      expect(code).toContain('createSignal')
      expect(code).toContain('__switchLocale')
      expect(code).not.toContain('shallowReactive')
    })

    it('generates Solid route runtime', () => {
      const plugins = fluentiSolid({ config: { splitting: 'dynamic', sourceLocale: 'en', locales: ['en', 'fr'], compileOutDir: 'compiled', catalogDir: './locales', format: 'po', include: ['./src/**/*.{tsx,jsx,ts,js}'] } })
      const virtual = plugins.find((p) => p.name === 'fluenti:virtual') as Plugin

      const code = callHook(virtual.load, {}, '\0virtual:fluenti/route-runtime') as string
      expect(code).toContain('createStore')
      expect(code).toContain('__loadRoute')
      expect(code).toContain('__registerRouteLoader')
    })
  })
})
