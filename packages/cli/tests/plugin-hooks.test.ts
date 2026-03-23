import { describe, it, expect, vi } from 'vitest'
import type { FluentiPlugin, PluginExtractContext, PluginCompileContext } from '@fluenti/core'

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
