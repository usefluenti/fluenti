import { describe, expect, it } from 'vitest'
import type { Plugin } from 'vite'
import fluentiReact from '../src/vite-plugin'

function callHook(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  const fn = typeof hook === 'function'
    ? hook
    : (hook as { handler?: (...hookArgs: unknown[]) => unknown } | undefined)?.handler
  return fn?.call(thisArg, ...args)
}

describe('fluentiReact', () => {
  it('returns the expected plugin pipeline', () => {
    const plugins = fluentiReact()
    const names = plugins.map((p) => p.name)
    expect(names).toContain('fluenti:virtual')
    expect(names).toContain('fluenti:script-transform')
    expect(names).toContain('fluenti:build-split')
    expect(names).toContain('fluenti:dev')
    // Should NOT contain vue-template or solid-jsx
    expect(names).not.toContain('fluenti:vue-template')
    expect(names).not.toContain('fluenti:solid-jsx')
  })

  describe('virtual modules with react runtime', () => {
    it('generates React runtime with plain objects when splitting is enabled', () => {
      const plugins = fluentiReact({ splitting: 'dynamic', locales: ['en', 'fr'] })
      const virtual = plugins.find((p) => p.name === 'fluenti:virtual') as Plugin

      const resolved = callHook(virtual.resolveId, {}, 'virtual:fluenti/runtime')
      expect(resolved).toBe('\0virtual:fluenti/runtime')

      const code = callHook(virtual.load, {}, '\0virtual:fluenti/runtime') as string
      expect(code).toContain('__catalog')
      expect(code).toContain('__switchLocale')
      expect(code).toContain('__preloadLocale')
      expect(code).not.toContain('shallowReactive')
      expect(code).not.toContain('createStore')
      expect(code).not.toContain('createSignal')
      expect(code).toContain("globalThis[Symbol.for('fluenti.runtime.react.v1')]")
    })

    it('generates React route runtime', () => {
      const plugins = fluentiReact({ splitting: 'dynamic', locales: ['en', 'fr'] })
      const virtual = plugins.find((p) => p.name === 'fluenti:virtual') as Plugin

      const code = callHook(virtual.load, {}, '\0virtual:fluenti/route-runtime') as string
      expect(code).toContain('__catalog')
      expect(code).toContain('__loadRoute')
      expect(code).toContain('__registerRouteLoader')
      expect(code).not.toContain('shallowReactive')
      expect(code).not.toContain('createStore')
    })
  })
})
