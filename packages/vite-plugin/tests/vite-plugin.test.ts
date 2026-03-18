import { describe, expect, it } from 'vitest'
import type { Plugin } from 'vite'
import { hashMessage } from '@fluenti/core'
import fluentiPlugin from '../src/index'

function getPlugin(
  name: string,
  options?: Parameters<typeof fluentiPlugin>[0],
): Plugin {
  const plugin = fluentiPlugin(options).find((entry) => entry.name === name)
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

describe('fluentiPlugin', () => {
  it('returns the expected default plugin pipeline', () => {
    const plugins = fluentiPlugin()
    expect(plugins.map((plugin) => plugin.name)).toEqual([
      'fluenti:virtual',
      'fluenti:vue-template',
      'fluenti:solid-jsx',
      'fluenti:script-transform',
      'fluenti:build-split',
      'fluenti:dev',
    ])
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

  describe('vue template transform', () => {
    it('transforms plain v-t content', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const input = '<template><h1 v-t>Hello World</h1></template><script setup></script>'
      const result = callHook(plugin.transform, {}, input, 'App.vue') as { code: string } | undefined

      expect(result?.code).toContain(`id: '${hashMessage('Hello World')}'`)
      expect(result?.code).toContain("message: 'Hello World'")
      expect(result?.code).not.toContain('v-t')
    })

    it('uses message + context identity for <Trans> and strips translation-only props from DOM output', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const input = '<template><Trans context="nav" comment="main header">Home</Trans></template><script setup></script>'
      const result = callHook(plugin.transform, {}, input, 'App.vue') as { code: string } | undefined

      expect(result?.code).toContain(`id: '${hashMessage('Home', 'nav')}'`)
      expect(result?.code).toContain("message: 'Home'")
      expect(result?.code).not.toContain('context="nav"')
      expect(result?.code).not.toContain('comment="main header"')
    })

    it('respects explicit <Trans id> without leaking it onto the wrapper element', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const input = '<template><Trans id="nav.home">Home</Trans></template><script setup></script>'
      const result = callHook(plugin.transform, {}, input, 'App.vue') as { code: string } | undefined

      expect(result?.code).toContain("id: 'nav.home'")
      expect(result?.code).toContain("message: 'Home'")
      expect(result?.code).not.toContain('id="nav.home"')
    })

    it('maps plural zero to ICU exact =0 form', () => {
      const plugin = getPlugin('fluenti:vue-template')
      const input = '<template><Plural :value="count" zero="No items" other="# items" /></template><script setup></script>'
      const result = callHook(plugin.transform, {}, input, 'App.vue') as { code: string } | undefined

      expect(result?.code).toContain('=0 {No items}')
      expect(result?.code).not.toContain('zero {No items}')
      expect(result?.code).toContain(`id: '${hashMessage('{count, plural, =0 {No items} other {# items}}')}'`)
      expect(result?.code).toContain("message: '{count, plural, =0 {No items} other {# items}}'")
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

  describe('solid jsx plugin', () => {
    it('does not rewrite Solid components in strict mode', () => {
      const plugin = getPlugin('fluenti:solid-jsx', { framework: 'solid' })
      const code = "import { Trans } from '@fluenti/solid'\nconst view = <Trans>Hello</Trans>"

      expect(callHook(plugin.transform, {}, code, 'App.tsx')).toBeUndefined()
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
  })
})
