import { describe, it, expect, vi } from 'vitest'
import { createPluginRunner } from '../src/plugin'
import { pseudoLocalePlugin, pseudoLocalize } from '../src/plugins/pseudo-locale'
import { messageValidatorPlugin } from '../src/plugins/message-validator'
import type { FluentiPlugin, PluginExtractContext, PluginCompileContext, FluentiConfig } from '../src/types'

function makeConfig(overrides?: Partial<FluentiConfig>): FluentiConfig {
  return {
    sourceLocale: 'en',
    locales: ['en', 'ja'],
    catalogDir: 'locales',
    format: 'po',
    include: ['src/**/*.ts'],
    compileOutDir: 'compiled',
    ...overrides,
  }
}

function makeExtractContext(overrides?: Partial<PluginExtractContext>): PluginExtractContext {
  return {
    messages: new Map(),
    sourceLocale: 'en',
    targetLocales: ['ja'],
    config: makeConfig(),
    ...overrides,
  }
}

function makeCompileContext(overrides?: Partial<PluginCompileContext>): PluginCompileContext {
  return {
    locale: 'en',
    messages: {},
    outDir: 'compiled',
    config: makeConfig(),
    ...overrides,
  }
}

describe('createPluginRunner', () => {
  describe('hook ordering', () => {
    it('calls hooks in registration order', async () => {
      const order: string[] = []

      const pluginA: FluentiPlugin = {
        name: 'a',
        onAfterExtract: () => { order.push('a') },
      }
      const pluginB: FluentiPlugin = {
        name: 'b',
        onAfterExtract: () => { order.push('b') },
      }
      const pluginC: FluentiPlugin = {
        name: 'c',
        onAfterExtract: () => { order.push('c') },
      }

      const runner = createPluginRunner([pluginA, pluginB, pluginC])
      await runner.runAfterExtract(makeExtractContext())

      expect(order).toEqual(['a', 'b', 'c'])
    })

    it('calls onBeforeCompile hooks in order', async () => {
      const order: string[] = []

      const runner = createPluginRunner([
        { name: 'first', onBeforeCompile: () => { order.push('first') } },
        { name: 'second', onBeforeCompile: () => { order.push('second') } },
      ])

      await runner.runBeforeCompile(makeCompileContext())
      expect(order).toEqual(['first', 'second'])
    })

    it('calls onAfterCompile hooks in order', async () => {
      const order: string[] = []

      const runner = createPluginRunner([
        { name: 'first', onAfterCompile: () => { order.push('first') } },
        { name: 'second', onAfterCompile: () => { order.push('second') } },
      ])

      await runner.runAfterCompile(makeCompileContext())
      expect(order).toEqual(['first', 'second'])
    })
  })

  describe('async hooks', () => {
    it('awaits async onAfterExtract hooks sequentially', async () => {
      const order: string[] = []

      const slowPlugin: FluentiPlugin = {
        name: 'slow',
        onAfterExtract: async () => {
          await new Promise((r) => setTimeout(r, 10))
          order.push('slow')
        },
      }

      const fastPlugin: FluentiPlugin = {
        name: 'fast',
        onAfterExtract: () => { order.push('fast') },
      }

      const runner = createPluginRunner([slowPlugin, fastPlugin])
      await runner.runAfterExtract(makeExtractContext())

      expect(order).toEqual(['slow', 'fast'])
    })

    it('awaits async transformMessages hooks', async () => {
      const plugin: FluentiPlugin = {
        name: 'async-transform',
        transformMessages: async (messages) => {
          await new Promise((r) => setTimeout(r, 5))
          const result: Record<string, string> = {}
          for (const [id, msg] of Object.entries(messages)) {
            result[id] = msg.toUpperCase()
          }
          return result
        },
      }

      const runner = createPluginRunner([plugin])
      const result = await runner.runTransformMessages({ hello: 'world' }, 'en')

      expect(result).toEqual({ hello: 'WORLD' })
    })
  })

  describe('error handling', () => {
    it('continues after a plugin hook throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const order: string[] = []

      const runner = createPluginRunner([
        {
          name: 'broken',
          onBeforeCompile: () => { throw new Error('plugin crashed') },
        },
        {
          name: 'healthy',
          onBeforeCompile: () => { order.push('healthy') },
        },
      ])

      await runner.runBeforeCompile(makeCompileContext())

      expect(order).toEqual(['healthy'])
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plugin "broken" onBeforeCompile failed: plugin crashed'),
      )

      warnSpy.mockRestore()
    })

    it('continues after transformMessages throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const runner = createPluginRunner([
        {
          name: 'broken',
          transformMessages: () => { throw new Error('transform failed') },
        },
        {
          name: 'uppercaser',
          transformMessages: (messages) => {
            const result: Record<string, string> = {}
            for (const [id, msg] of Object.entries(messages)) {
              result[id] = msg.toUpperCase()
            }
            return result
          },
        },
      ])

      const result = await runner.runTransformMessages({ greeting: 'hello' }, 'en')

      // broken plugin is skipped, uppercaser still runs on original input
      expect(result).toEqual({ greeting: 'HELLO' })
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Plugin "broken" transformMessages failed'),
      )

      warnSpy.mockRestore()
    })
  })

  describe('transformMessages', () => {
    it('pipes output from one plugin to the next', async () => {
      const runner = createPluginRunner([
        {
          name: 'prefix',
          transformMessages: (messages) => {
            const result: Record<string, string> = {}
            for (const [id, msg] of Object.entries(messages)) {
              result[id] = `[${msg}]`
            }
            return result
          },
        },
        {
          name: 'upper',
          transformMessages: (messages) => {
            const result: Record<string, string> = {}
            for (const [id, msg] of Object.entries(messages)) {
              result[id] = msg.toUpperCase()
            }
            return result
          },
        },
      ])

      const result = await runner.runTransformMessages({ hello: 'world' }, 'en')
      expect(result).toEqual({ hello: '[WORLD]' })
    })

    it('passes frozen messages to plugins (immutability)', async () => {
      const runner = createPluginRunner([
        {
          name: 'mutator',
          transformMessages: (messages) => {
            // Attempting to mutate the frozen input should throw
            expect(() => {
              (messages as Record<string, string>)['new'] = 'value'
            }).toThrow()
            return { ...messages }
          },
        },
      ])

      await runner.runTransformMessages({ hello: 'world' }, 'en')
    })
  })

  describe('collectFormatters', () => {
    it('merges formatters from all plugins', () => {
      const fmtA = (_v: unknown, _s: string, _l: string) => 'a'
      const fmtB = (_v: unknown, _s: string, _l: string) => 'b'

      const runner = createPluginRunner([
        { name: 'a', formatters: { currency: fmtA } },
        { name: 'b', formatters: { list: fmtB } },
      ])

      const formatters = runner.collectFormatters()
      expect(formatters).toEqual({ currency: fmtA, list: fmtB })
    })

    it('later plugins override earlier formatters with same name', () => {
      const fmtOld = (_v: unknown, _s: string, _l: string) => 'old'
      const fmtNew = (_v: unknown, _s: string, _l: string) => 'new'

      const runner = createPluginRunner([
        { name: 'old', formatters: { currency: fmtOld } },
        { name: 'new', formatters: { currency: fmtNew } },
      ])

      const formatters = runner.collectFormatters()
      expect(formatters.currency).toBe(fmtNew)
    })
  })

  describe('skips plugins without relevant hooks', () => {
    it('skips plugins that only have unrelated hooks', async () => {
      const order: string[] = []

      const runner = createPluginRunner([
        {
          name: 'extract-only',
          onAfterExtract: () => { order.push('extract') },
        },
        {
          name: 'compile-only',
          onBeforeCompile: () => { order.push('compile') },
        },
      ])

      await runner.runBeforeCompile(makeCompileContext())
      expect(order).toEqual(['compile'])
    })
  })
})

describe('pseudoLocalePlugin', () => {
  describe('pseudoLocalize', () => {
    it('transforms ASCII characters to accented equivalents', () => {
      const result = pseudoLocalize('Hello')
      expect(result).toBe('[\u0126\u00eb\u013c\u013c\u00f6]')
    })

    it('wraps result in brackets', () => {
      const result = pseudoLocalize('Hi')
      expect(result.startsWith('[')).toBe(true)
      expect(result.endsWith(']')).toBe(true)
    })

    it('preserves ICU variable blocks', () => {
      const result = pseudoLocalize('Hello {name}')
      expect(result).toContain('{name}')
    })

    it('preserves nested ICU blocks', () => {
      const result = pseudoLocalize('{count, plural, one {# item} other {# items}}')
      expect(result).toContain('{count, plural, one {# item} other {# items}}')
    })

    it('handles empty string', () => {
      expect(pseudoLocalize('')).toBe('[]')
    })

    it('preserves non-ASCII characters', () => {
      const result = pseudoLocalize('Hello 123!')
      expect(result).toContain('123')
      expect(result).toContain('!')
    })
  })

  describe('plugin behavior', () => {
    it('only transforms messages for the target pseudo-locale', async () => {
      const plugin = pseudoLocalePlugin({ locale: 'pseudo' })
      const runner = createPluginRunner([plugin])

      const enResult = await runner.runTransformMessages({ greeting: 'Hello' }, 'en')
      expect(enResult.greeting).toBe('Hello')

      const pseudoResult = await runner.runTransformMessages({ greeting: 'Hello' }, 'pseudo')
      expect(pseudoResult.greeting).toContain('[')
      expect(pseudoResult.greeting).not.toBe('Hello')
    })

    it('defaults to "pseudo" locale when no option provided', async () => {
      const plugin = pseudoLocalePlugin()
      const runner = createPluginRunner([plugin])

      const result = await runner.runTransformMessages({ greeting: 'Hello' }, 'pseudo')
      expect(result.greeting).not.toBe('Hello')
    })

    it('uses custom locale when specified', async () => {
      const plugin = pseudoLocalePlugin({ locale: 'xx-pseudo' })
      const runner = createPluginRunner([plugin])

      const defaultResult = await runner.runTransformMessages({ greeting: 'Hello' }, 'pseudo')
      expect(defaultResult.greeting).toBe('Hello')

      const customResult = await runner.runTransformMessages({ greeting: 'Hello' }, 'xx-pseudo')
      expect(customResult.greeting).not.toBe('Hello')
    })
  })
})

describe('messageValidatorPlugin', () => {
  it('warns about invalid ICU syntax', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = messageValidatorPlugin()
    const runner = createPluginRunner([plugin])

    await runner.runBeforeCompile(makeCompileContext({
      locale: 'en',
      messages: {
        valid: 'Hello {name}',
        broken: '{count, plural, one {item}',  // missing closing brace
      },
    }))

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid ICU syntax'),
    )

    warnSpy.mockRestore()
  })

  it('does not warn for valid messages', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = messageValidatorPlugin()
    const runner = createPluginRunner([plugin])

    await runner.runBeforeCompile(makeCompileContext({
      locale: 'en',
      messages: {
        greeting: 'Hello {name}',
        simple: 'Just text',
        plural: '{count, plural, one {# item} other {# items}}',
      },
    }))

    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('warns about mismatched placeholders across locales', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = messageValidatorPlugin()
    const runner = createPluginRunner([plugin])

    // First call records source locale variables
    await runner.runBeforeCompile(makeCompileContext({
      locale: 'en',
      messages: { greeting: 'Hello {name} from {city}' },
    }))

    // Second call checks target locale against source
    await runner.runBeforeCompile(makeCompileContext({
      locale: 'ja',
      messages: { greeting: '{name}さん、こんにちは' },  // missing {city}
    }))

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing placeholders'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('{city}'),
    )

    warnSpy.mockRestore()
  })

  it('warns about extra placeholders in translations', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plugin = messageValidatorPlugin()
    const runner = createPluginRunner([plugin])

    await runner.runBeforeCompile(makeCompileContext({
      locale: 'en',
      messages: { greeting: 'Hello {name}' },
    }))

    await runner.runBeforeCompile(makeCompileContext({
      locale: 'ja',
      messages: { greeting: '{name}さん {extra}' },  // extra placeholder
    }))

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Extra placeholders'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('{extra}'),
    )

    warnSpy.mockRestore()
  })
})
