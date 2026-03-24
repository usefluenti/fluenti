import { describe, it, expect, vi } from 'vitest'
import { withLocale } from '../src/with-locale'

function makeServerModule(locale = 'en') {
  const setLocale = vi.fn()
  let currentLocale = locale
  const getI18n = vi.fn(() => Promise.resolve({ locale: currentLocale }))
  setLocale.mockImplementation((l: string) => { currentLocale = l })
  return { setLocale, getI18n }
}

describe('withLocale', () => {
  it('throws a helpful error when serverModule is not provided', async () => {
    await expect(withLocale('ja', () => 'result')).rejects.toThrow(
      '[fluenti] withLocale requires a server module reference',
    )
  })

  it('switches locale, runs fn, then restores the previous locale', async () => {
    const serverModule = makeServerModule('en')
    const order: string[] = []

    serverModule.setLocale.mockImplementation((l: string) => { order.push(`set:${l}`) })

    await withLocale('ja', () => { order.push('fn') }, serverModule)

    expect(order).toEqual(['set:ja', 'fn', 'set:en'])
  })

  it('restores the previous locale even when fn() throws', async () => {
    const serverModule = makeServerModule('en')

    await expect(
      withLocale('ja', () => { throw new Error('boom') }, serverModule),
    ).rejects.toThrow('boom')

    // Last setLocale call should restore 'en'
    const calls = serverModule.setLocale.mock.calls
    expect(calls.at(-1)![0]).toBe('en')
  })

  it('returns the result of fn()', async () => {
    const serverModule = makeServerModule('en')

    const result = await withLocale('ja', () => 'hello from ja', serverModule)

    expect(result).toBe('hello from ja')
  })

  it('supports async fn()', async () => {
    const serverModule = makeServerModule('en')

    const result = await withLocale(
      'ja',
      async () => {
        await Promise.resolve()
        return 42
      },
      serverModule,
    )

    expect(result).toBe(42)
  })

  it('calls getI18n() after each setLocale to force re-initialization', async () => {
    const serverModule = makeServerModule('en')

    await withLocale('ja', () => 'ok', serverModule)

    // getI18n calls: 1 (read prev) + 1 (after set ja) + 1 (after restore en) = 3
    expect(serverModule.getI18n).toHaveBeenCalledTimes(3)
  })

  it('reads the previous locale from getI18n() result', async () => {
    const serverModule = makeServerModule('zh-CN')

    await withLocale('ja', () => 'ok', serverModule)

    // Should restore 'zh-CN', not 'en'
    const calls = serverModule.setLocale.mock.calls
    expect(calls.at(-1)![0]).toBe('zh-CN')
  })
})
