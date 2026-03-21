import { describe, expect, it } from 'vitest'
import { parallelCompile } from '../src/parallel-compile'
import type { ParallelCompileTask } from '../src/parallel-compile'
import type { CatalogData } from '../src/catalog'

function makeCatalog(messages: Record<string, string>): CatalogData {
  const catalog: CatalogData = {}
  for (const [id, translation] of Object.entries(messages)) {
    catalog[id] = { message: id, translation }
  }
  return catalog
}

describe('parallelCompile', () => {
  it('returns empty array for no tasks', async () => {
    const results = await parallelCompile([])
    expect(results).toEqual([])
  })

  it('compiles single task in-process (no worker)', async () => {
    const catalog = makeCatalog({ Hello: 'こんにちは' })
    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog, allIds: ['Hello'], sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(1)
    expect(results[0]!.locale).toBe('ja')
    expect(results[0]!.code).toContain('こんにちは')
    expect(results[0]!.stats.compiled).toBe(1)
  })

  it('compiles multiple locales in parallel', async () => {
    const jaCatalog = makeCatalog({ Hello: 'こんにちは', World: '世界' })
    const zhCatalog = makeCatalog({ Hello: '你好', World: '世界' })
    const allIds = ['Hello', 'World']

    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog: jaCatalog, allIds, sourceLocale: 'en' },
      { locale: 'zh-CN', catalog: zhCatalog, allIds, sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(2)

    const locales = results.map((r) => r.locale).sort()
    expect(locales).toEqual(['ja', 'zh-CN'])

    const jaResult = results.find((r) => r.locale === 'ja')!
    expect(jaResult.code).toContain('こんにちは')
    expect(jaResult.stats.compiled).toBe(2)

    const zhResult = results.find((r) => r.locale === 'zh-CN')!
    expect(zhResult.code).toContain('你好')
    expect(zhResult.stats.compiled).toBe(2)
  })

  it('respects concurrency limit', async () => {
    const allIds = ['Hello']
    const tasks: ParallelCompileTask[] = Array.from({ length: 4 }, (_, i) => ({
      locale: `locale-${i}`,
      catalog: makeCatalog({ Hello: `Translation ${i}` }),
      allIds,
      sourceLocale: 'en',
    }))

    // Limit to 2 concurrent workers
    const results = await parallelCompile(tasks, 2)
    expect(results).toHaveLength(4)
    for (const result of results) {
      expect(result.stats.compiled).toBe(1)
    }
  })

  it('reports missing translations', async () => {
    const catalog: CatalogData = {
      Hello: { message: 'Hello', translation: 'こんにちは' },
      World: { message: 'World', translation: '' },
    }
    const tasks: ParallelCompileTask[] = [
      { locale: 'ja', catalog, allIds: ['Hello', 'World'], sourceLocale: 'en' },
      { locale: 'ko', catalog: {}, allIds: ['Hello', 'World'], sourceLocale: 'en' },
    ]

    const results = await parallelCompile(tasks)
    expect(results).toHaveLength(2)

    const jaResult = results.find((r) => r.locale === 'ja')!
    expect(jaResult.stats.compiled).toBe(1)
    expect(jaResult.stats.missing).toContain('World')

    const koResult = results.find((r) => r.locale === 'ko')!
    expect(koResult.stats.missing).toEqual(['Hello', 'World'])
  })
})
