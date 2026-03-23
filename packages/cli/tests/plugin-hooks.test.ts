import { describe, it, expect, vi } from 'vitest'
import type { FluentiPlugin, PluginExtractContext, PluginCompileContext } from '@fluenti/core'
import { compileCatalog, collectAllIds } from '../src/compile'
import type { CatalogData } from '../src/catalog'

describe('plugin hooks', () => {
  it('onAfterExtract receives correct context shape', async () => {
    const hook = vi.fn()
    const plugin: FluentiPlugin = { name: 'test', onAfterExtract: hook }

    const context: PluginExtractContext = {
      messages: new Map(),
      sourceLocale: 'en',
      targetLocales: ['ja', 'fr'],
    }

    await plugin.onAfterExtract!(context)
    expect(hook).toHaveBeenCalledWith(context)
    expect(hook.mock.calls[0]![0]).toHaveProperty('sourceLocale', 'en')
    expect(hook.mock.calls[0]![0]).toHaveProperty('targetLocales', ['ja', 'fr'])
  })

  it('onBeforeCompile and onAfterCompile receive locale and outDir', async () => {
    const before = vi.fn()
    const after = vi.fn()
    const plugin: FluentiPlugin = { name: 'test', onBeforeCompile: before, onAfterCompile: after }

    const context: PluginCompileContext = {
      locale: 'ja',
      messages: {},
      outDir: '/out',
    }

    await plugin.onBeforeCompile!(context)
    await plugin.onAfterCompile!(context)
    expect(before).toHaveBeenCalledWith(context)
    expect(after).toHaveBeenCalledWith(context)
  })

  it('transformMessages modifies messages', async () => {
    const plugin: FluentiPlugin = {
      name: 'upper',
      transformMessages: async (msgs) => {
        const result: Record<string, string> = {}
        for (const [k, v] of Object.entries(msgs)) {
          result[k] = v.toUpperCase()
        }
        return result
      },
    }

    const output = await plugin.transformMessages!({ hello: 'world' }, 'en')
    expect(output).toEqual({ hello: 'WORLD' })
  })

  it('plugins execute in array order', async () => {
    const order: string[] = []
    const plugins: FluentiPlugin[] = [
      { name: 'first', onAfterExtract: () => { order.push('first') } },
      { name: 'second', onAfterExtract: () => { order.push('second') } },
    ]

    for (const p of plugins) {
      await p.onAfterExtract?.({ messages: new Map(), sourceLocale: 'en', targetLocales: [] })
    }
    expect(order).toEqual(['first', 'second'])
  })

  it('async hooks are awaited', async () => {
    const order: string[] = []
    const plugin: FluentiPlugin = {
      name: 'async',
      onAfterExtract: async () => {
        await new Promise(r => setTimeout(r, 10))
        order.push('done')
      },
    }

    await plugin.onAfterExtract!({ messages: new Map(), sourceLocale: 'en', targetLocales: [] })
    expect(order).toEqual(['done'])
  })
})

// ---- Integration tests: plugin hooks in the compile pipeline ----

/** Replicate applyTransformMessages from cli.ts to test the integration pattern */
async function applyTransformMessages(
  catalog: CatalogData,
  locale: string,
  plugins: readonly FluentiPlugin[],
): Promise<CatalogData> {
  let rawMessages: Record<string, string> = {}
  for (const [id, entry] of Object.entries(catalog)) {
    if (entry.translation && entry.translation.length > 0) {
      rawMessages[id] = entry.translation
    } else if (entry.message) {
      rawMessages[id] = entry.message
    }
  }

  for (const plugin of plugins) {
    if (plugin.transformMessages) {
      rawMessages = await plugin.transformMessages(rawMessages, locale)
    }
  }

  const updated: CatalogData = {}
  for (const [id, entry] of Object.entries(catalog)) {
    const transformed = rawMessages[id]
    updated[id] = transformed !== undefined
      ? { ...entry, translation: transformed }
      : { ...entry }
  }
  return updated
}

/** Replicate buildCompileContext from cli.ts */
function buildCompileContext(
  locale: string,
  catalog: CatalogData,
  outDir: string,
): PluginCompileContext {
  const messages: Record<string, string> = {}
  for (const [id, entry] of Object.entries(catalog)) {
    if (entry.translation && entry.translation.length > 0) {
      messages[id] = entry.translation
    } else if (entry.message) {
      messages[id] = entry.message
    }
  }
  return { locale, messages, outDir }
}

describe('plugin hooks integration', () => {
  it('transformMessages uppercases translations in compiled output', async () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello', translation: 'hello world' },
      farewell: { message: 'Bye', translation: 'goodbye' },
    }

    const plugin: FluentiPlugin = {
      name: 'uppercase',
      transformMessages: async (msgs) => {
        const result: Record<string, string> = {}
        for (const [k, v] of Object.entries(msgs)) {
          result[k] = v.toUpperCase()
        }
        return result
      },
    }

    const transformed = await applyTransformMessages(catalog, 'en', [plugin])

    // Verify catalog entries were transformed
    expect(transformed.greeting!.translation).toBe('HELLO WORLD')
    expect(transformed.farewell!.translation).toBe('GOODBYE')

    // Compile the transformed catalog and verify the output JS contains uppercase text
    const allIds = collectAllIds({ en: transformed })
    const { code } = compileCatalog(transformed, 'en', allIds, 'en')
    expect(code).toContain('HELLO WORLD')
    expect(code).toContain('GOODBYE')

    // The original lowercase text should NOT appear in the compiled output
    expect(code).not.toContain('"hello world"')
    expect(code).not.toContain('"goodbye"')
  })

  it('onBeforeCompile fires before onAfterCompile', async () => {
    const order: string[] = []
    const catalog: CatalogData = {
      msg: { message: 'test', translation: 'test' },
    }

    const plugin: FluentiPlugin = {
      name: 'order-tracker',
      onBeforeCompile: async () => { order.push('before') },
      onAfterCompile: async () => { order.push('after') },
    }

    const plugins = [plugin]
    const locale = 'en'
    const allIds = collectAllIds({ [locale]: catalog })

    // Simulate the compile pipeline: before → compile → after
    for (const p of plugins) {
      await p.onBeforeCompile?.(buildCompileContext(locale, catalog, '/out'))
    }

    compileCatalog(catalog, locale, allIds, 'en')

    for (const p of plugins) {
      await p.onAfterCompile?.(buildCompileContext(locale, catalog, '/out'))
    }

    expect(order).toEqual(['before', 'after'])
  })

  it('multiple plugins chain transformMessages in order', async () => {
    const catalog: CatalogData = {
      msg: { message: 'hello', translation: 'hello' },
    }

    const pluginA: FluentiPlugin = {
      name: 'prefix',
      transformMessages: async (msgs) => {
        const result: Record<string, string> = {}
        for (const [k, v] of Object.entries(msgs)) {
          result[k] = `[A]${v}`
        }
        return result
      },
    }

    const pluginB: FluentiPlugin = {
      name: 'suffix',
      transformMessages: async (msgs) => {
        const result: Record<string, string> = {}
        for (const [k, v] of Object.entries(msgs)) {
          result[k] = `${v}[B]`
        }
        return result
      },
    }

    const transformed = await applyTransformMessages(catalog, 'en', [pluginA, pluginB])
    expect(transformed.msg!.translation).toBe('[A]hello[B]')
  })

  it('compile context messages contain raw strings, not compiled functions', async () => {
    const catalog: CatalogData = {
      greeting: { message: 'Hello {name}', translation: 'Hello {name}' },
      count: { message: '{count, plural, one {# item} other {# items}}', translation: '{count, plural, one {# item} other {# items}}' },
    }

    const context = buildCompileContext('en', catalog, '/out')

    // All messages should be raw strings, not functions
    for (const value of Object.values(context.messages)) {
      expect(typeof value).toBe('string')
    }

    expect(context.messages.greeting).toBe('Hello {name}')
    expect(context.messages.count).toBe('{count, plural, one {# item} other {# items}}')
  })
})
