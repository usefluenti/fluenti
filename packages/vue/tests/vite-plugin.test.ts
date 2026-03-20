import { describe, expect, it } from 'vitest'
import type { Plugin } from 'vite'
import { hashMessage } from '@fluenti/core'
import fluentiVue from '../src/vite-plugin'

function getPlugin(name: string, options?: Parameters<typeof fluentiVue>[0]): Plugin {
  const plugin = fluentiVue(options).find((entry) => entry.name === name)
  if (!plugin) throw new Error(`Missing plugin ${name}`)
  return plugin as Plugin
}

function callHook(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  const fn = typeof hook === 'function'
    ? hook
    : (hook as { handler?: (...hookArgs: unknown[]) => unknown } | undefined)?.handler
  return fn?.call(thisArg, ...args)
}

describe('fluentiVue', () => {
  it('returns the expected plugin pipeline', () => {
    const plugins = fluentiVue()
    const names = plugins.map((p) => p.name)
    expect(names).toContain('fluenti:virtual')
    expect(names).toContain('fluenti:vue-template')
    expect(names).toContain('fluenti:script-transform')
    expect(names).toContain('fluenti:build-split')
    expect(names).toContain('fluenti:dev')
    // Should NOT contain solid-jsx
    expect(names).not.toContain('fluenti:solid-jsx')
  })

  describe('vue template transform', () => {
    it('transforms plain v-t content', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const input = '<template><h1 v-t>Hello World</h1></template><script setup></script>'
      const result = callHook(plugin.transform, {}, input, 'App.vue') as { code: string } | undefined

      expect(result?.code).toContain(`id: '${hashMessage('Hello World')}'`)
      expect(result?.code).toContain("message: 'Hello World'")
      expect(result?.code).not.toContain('v-t')
    })

    it('skips non-Vue files', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const result = callHook(plugin.transform, {}, '<h1 v-t>Hello</h1>', 'App.tsx')
      expect(result).toBeUndefined()
    })
  })

  describe('virtual modules with vue runtime', () => {
    it('generates Vue runtime with shallowReactive when splitting is enabled', () => {
      const plugins = fluentiVue({ splitting: 'dynamic', locales: ['en', 'fr'] })
      const virtual = plugins.find((p) => p.name === 'fluenti:virtual') as Plugin

      // Simulate resolveId
      const resolved = callHook(virtual.resolveId, {}, 'virtual:fluenti/runtime')
      expect(resolved).toBe('\0virtual:fluenti/runtime')

      // Simulate load
      const code = callHook(virtual.load, {}, '\0virtual:fluenti/runtime') as string
      expect(code).toContain('shallowReactive')
      expect(code).toContain('__switchLocale')
      expect(code).not.toContain('createStore')
      expect(code).not.toContain('createSignal')
    })
  })
})
