import { describe, expect, it, vi } from 'vitest'
import type { Plugin } from 'vite'
import { hashMessage } from '@fluenti/core'
import { createFluentiPlugins } from '../src/index'
import type { FluentiCoreOptions } from '../src/types'

vi.mock('@fluenti/core/internal', async () => {
  const actual = await vi.importActual<typeof import('@fluenti/core/internal')>('@fluenti/core/internal')
  return {
    ...actual,
    runExtractCompile: vi.fn(() => Promise.resolve()),
  }
})

function createPlugins(options?: Partial<FluentiCoreOptions>): Plugin[] {
  return createFluentiPlugins({ framework: 'vue', ...options }, [])
}

function getPlugin(
  name: string,
  options?: Partial<FluentiCoreOptions>,
): Plugin {
  const plugin = createPlugins(options).find((entry) => entry.name === name)
  if (!plugin) {
    throw new Error(`Missing plugin ${name}`)
  }
  return plugin as Plugin
}

function callHook(hook: unknown, thisArg: unknown, ...args: unknown[]): unknown {
  const fn = typeof hook === 'function'
    ? hook
    : (hook as { handler?: (...hookArgs: unknown[]) => unknown } | undefined)?.handler

  return fn?.call(thisArg, ...args)
}

describe('createFluentiPlugins', () => {
  it('returns the expected core plugin pipeline', () => {
    const plugins = createPlugins()
    expect(plugins.map((plugin) => plugin.name)).toEqual([
      'fluenti:virtual',
      'fluenti:script-transform',
      'fluenti:build-compile',
      'fluenti:build-split',
      'fluenti:dev',
    ])
  })

  it('includes framework plugins when provided', () => {
    const customPlugin: Plugin = { name: 'fluenti:vue-template' }
    const plugins = createFluentiPlugins({ framework: 'vue' }, [customPlugin])
    const names = plugins.map((p) => p.name)
    expect(names).toContain('fluenti:vue-template')
    expect(names.indexOf('fluenti:vue-template')).toBeLessThan(names.indexOf('fluenti:script-transform'))
  })

  describe('virtual modules', () => {
    it('resolves and loads locale catalog modules', () => {
      const plugin = getPlugin('fluenti:virtual')
      const resolved = callHook(plugin.resolveId, {}, 'virtual:fluenti/messages/en')
      expect(resolved).toBe('\0virtual:fluenti/messages/en')

      const loaded = callHook(plugin.load, {}, '\0virtual:fluenti/messages/en')
      expect(loaded).toContain("export { default } from 'src/locales/compiled/en.js'")
    })

    it('ignores unrelated module ids', () => {
      const plugin = getPlugin('fluenti:virtual')
      expect(callHook(plugin.resolveId, {}, 'virtual:other/messages/en')).toBeUndefined()
      expect(callHook(plugin.load, {}, 'virtual:other/messages/en')).toBeUndefined()
    })
  })

  describe('script transform', () => {
    it('optimizes tagged templates only when t is destructured from useI18n()', () => {
      const plugin = getPlugin('fluenti:script-transform')
      const code = `
import { useI18n } from '@fluenti/vue'
const { t } = useI18n()
const msg = t\`Hello \${name}\`
`
      const result = callHook(plugin.transform, {}, code, 'App.vue?type=script') as { code: string } | undefined

      expect(result?.code).toContain("t({ id:")
      expect(result?.code).toContain("message: 'Hello {name}' }, { name: name })")
      expect(result?.code).not.toContain('t`Hello')
      expect(result?.code).not.toContain('__i18n')
    })

    it('supports renamed destructuring bindings', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = `
import { useI18n } from '@fluenti/react'
const { t: translate } = useI18n()
const label = translate\`Dashboard\`
`
      const result = callHook(plugin.transform, {}, code, 'Dashboard.tsx') as { code: string } | undefined

      expect(result?.code).toContain("translate({ id:")
      expect(result?.code).toContain("message: 'Dashboard' })")
      expect(result?.code).not.toContain('translate`Dashboard`')
    })

    it('supports direct-import t in React component scope', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = `
import { t } from '@fluenti/react'
export function Hero() {
  return <h1>{t\`Hello \${name}\`}</h1>
}
`
      const result = callHook(plugin.transform, {}, code, 'Hero.tsx') as { code: string } | undefined

      expect(result?.code).toContain("import { useI18n } from '@fluenti/react'")
      expect(result?.code).toContain("const { t: __fluenti_t } = useI18n()")
      expect(result?.code).toContain("__fluenti_t({ id:")
      expect(result?.code).not.toContain("import { t } from '@fluenti/react'")
    })

    it('supports direct-import descriptor calls with stable ids', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = `
import { t } from '@fluenti/react'
export function Nav() {
  return <span>{t({ message: 'Home', context: 'nav', comment: 'main link' })}</span>
}
`
      const result = callHook(plugin.transform, {}, code, 'Nav.tsx') as { code: string } | undefined

      expect(result?.code).toContain("const { t: __fluenti_t } = useI18n()")
      expect(result?.code).toContain("message: 'Home'")
      expect(result?.code).toContain("context: 'nav'")
      expect(result?.code).not.toContain("comment: 'main link'")
    })

    it('detects direct-import t when it is not the first imported specifier', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'solid' })
      const code = `
import { Plural, t } from '@fluenti/solid'
export default function Demo() {
  return <Plural value={count()} zero={t\`Zero\`} other={t\`Many\`} />
}
`
      const result = callHook(plugin.transform, {}, code, 'Demo.tsx') as { code: string } | undefined

      expect(result?.code).toContain("import { Plural, useI18n } from '@fluenti/solid'")
      expect(result?.code).toContain('zero={__fluenti_t({ id:')
      expect(result?.code).toContain('other={__fluenti_t({ id:')
      expect(result?.code).not.toContain("import { Plural, t } from '@fluenti/solid'")
    })

    it('throws for unsupported top-level direct-import t usage', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = `
import { t } from '@fluenti/react'
const label = t\`Hello\`
`

      expect(() => callHook(plugin.transform, {}, code, 'labels.tsx')).toThrow(/compile-time/i)
    })

    it('keeps direct t() calls as runtime code', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = `
import { useI18n } from '@fluenti/react'
const { t } = useI18n()
const label = t('nav.home')
`

      expect(callHook(plugin.transform, {}, code, 'Nav.tsx')).toBeUndefined()
    })

    it('leaves unbound tagged templates untouched', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = 'const msg = t`Hello`'

      expect(callHook(plugin.transform, {}, code, 'App.tsx')).toBeUndefined()
    })

    it('applies the JSX <Trans> fast path with context-aware ids', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      const code = 'export function Hero() { return <Trans context="hero">Welcome</Trans> }'
      const result = callHook(plugin.transform, {}, code, 'Hero.tsx') as { code: string } | undefined

      expect(result?.code).toContain(`__id="${hashMessage('Welcome', 'hero')}"`)
      expect(result?.code).toContain('__message="Welcome"')
      expect(result?.code).toContain('context="hero"')
    })

    it('skips node_modules and non-script vue blocks', () => {
      const plugin = getPlugin('fluenti:script-transform', { framework: 'react' })
      expect(callHook(plugin.transform, {}, 'const msg = t`Hello`', '/project/node_modules/pkg/index.tsx')).toBeUndefined()
      expect(callHook(plugin.transform, {}, '<template><Trans>Hello</Trans></template>', 'App.vue')).toBeUndefined()
    })
  })

  describe('build-compile plugin', () => {
    it('calls runExtractCompile in build mode', async () => {
      const { runExtractCompile } = await import('@fluenti/core/internal')
      const mockRun = vi.mocked(runExtractCompile)
      mockRun.mockClear()

      const plugin = getPlugin('fluenti:build-compile')
      const buildContext = { environment: { mode: 'build' } }

      await callHook(plugin.buildStart, buildContext)

      expect(mockRun).toHaveBeenCalledWith({ cwd: expect.any(String), throwOnError: true })
    })

    it('does not call runExtractCompile in dev mode', async () => {
      const { runExtractCompile } = await import('@fluenti/core/internal')
      const mockRun = vi.mocked(runExtractCompile)
      mockRun.mockClear()

      const plugin = getPlugin('fluenti:build-compile')
      const devContext = { environment: { mode: 'development' } }

      await callHook(plugin.buildStart, devContext)

      expect(mockRun).not.toHaveBeenCalled()
    })

    it('does not call runExtractCompile when buildAutoCompile is false', async () => {
      const { runExtractCompile } = await import('@fluenti/core/internal')
      const mockRun = vi.mocked(runExtractCompile)
      mockRun.mockClear()

      const plugin = getPlugin('fluenti:build-compile', { buildAutoCompile: false })
      const buildContext = { environment: { mode: 'build' } }

      await callHook(plugin.buildStart, buildContext)

      expect(mockRun).not.toHaveBeenCalled()
    })
  })

  describe('dev plugin', () => {
    it('returns virtual modules on catalog updates', () => {
      const plugin = getPlugin('fluenti:dev')
      const module = { id: '\0virtual:fluenti/messages/en' }
      const context = {
        environment: {
          moduleGraph: {
            urlToModuleMap: new Map([['virtual:fluenti/messages/en', module]]),
          },
        },
      }

      const result = callHook(
        plugin.hotUpdate,
        context,
        { file: '/project/src/locales/compiled/en.js' },
      )

      expect(result).toEqual([module])
    })

    it('ignores unrelated file updates', () => {
      const plugin = getPlugin('fluenti:dev')
      const context = {
        environment: {
          moduleGraph: {
            urlToModuleMap: new Map(),
          },
        },
      }

      const result = callHook(
        plugin.hotUpdate,
        context,
        { file: '/project/src/pages/index.tsx' },
      )

      expect(result).toBeUndefined()
    })

    it('configureServer triggers initial debounced run when devAutoCompile is enabled', () => {
      const plugin = getPlugin('fluenti:dev')
      const watcherEvents = new Map<string, (...args: unknown[]) => void>()
      const server = {
        config: { root: '/project' },
        watcher: {
          on(event: string, handler: (...args: unknown[]) => void) {
            watcherEvents.set(event, handler)
          },
        },
      }

      // Should not throw — just registers watcher
      callHook(plugin.configureServer, {}, server)
      expect(watcherEvents.has('change')).toBe(true)
    })

    it('does not set up auto-compile when devAutoCompile is false', () => {
      const plugin = getPlugin('fluenti:dev', { devAutoCompile: false })
      const watcherEvents = new Map<string, (...args: unknown[]) => void>()
      const server = {
        config: { root: '/project' },
        watcher: {
          on(event: string, handler: (...args: unknown[]) => void) {
            watcherEvents.set(event, handler)
          },
        },
      }

      callHook(plugin.configureServer, {}, server)
      expect(watcherEvents.has('change')).toBe(false)
    })
  })
})
