import { bench, describe } from 'vitest'
import { compileCatalog } from '../src/compile'
import { parallelCompile } from '../src/parallel-compile'
import type { ParallelCompileTask } from '../src/parallel-compile'
import type { CatalogData } from '../src/catalog'

// ── Helpers ──

const ICU_MESSAGES: Record<string, string> = {
  greeting: 'Hello {name}',
  items: '{count, plural, one {# item} other {# items}}',
  gender: '{gender, select, male {He} female {She} other {They}} went to {place}',
  nested: '{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} female {{count, plural, one {She has # item} other {She has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}',
  welcome: 'Welcome to {app}, {userName}! You have {count, plural, one {# notification} other {# notifications}}.',
  balance: 'Balance: {amount, number, currency}',
  date: 'Created on {date, date, short}',
  farewell: 'Goodbye {name}, see you on {date, date, short}!',
}

function makeCatalog(size: number): CatalogData {
  const catalog: CatalogData = {}
  const messageKeys = Object.keys(ICU_MESSAGES)
  for (let i = 0; i < size; i++) {
    const key = messageKeys[i % messageKeys.length]!
    const id = `msg_${i}`
    catalog[id] = {
      message: id,
      translation: ICU_MESSAGES[key]!.replace('{name}', `{name}`) + ` (${i})`,
    }
  }
  return catalog
}

function makeLocales(
  localeCount: number,
  messagesPerLocale: number,
): { tasks: ParallelCompileTask[]; allIds: string[] } {
  const catalog = makeCatalog(messagesPerLocale)
  const allIds = Object.keys(catalog)
  const locales = Array.from({ length: localeCount }, (_, i) => `locale-${i}`)

  const tasks: ParallelCompileTask[] = locales.map((locale) => ({
    locale,
    catalog,
    allIds,
    sourceLocale: 'en',
  }))

  return { tasks, allIds }
}

// ── Single-locale baseline ──

describe('single locale (sequential baseline)', () => {
  const catalog50 = makeCatalog(50)
  const ids50 = Object.keys(catalog50)
  const catalog200 = makeCatalog(200)
  const ids200 = Object.keys(catalog200)
  const catalog500 = makeCatalog(500)
  const ids500 = Object.keys(catalog500)

  bench('50 messages', () => {
    compileCatalog(catalog50, 'ja', ids50, 'en')
  })

  bench('200 messages', () => {
    compileCatalog(catalog200, 'ja', ids200, 'en')
  })

  bench('500 messages', () => {
    compileCatalog(catalog500, 'ja', ids500, 'en')
  })
})

// ── Sequential multi-locale (loop) ──

describe('sequential multi-locale (for-loop)', () => {
  const { tasks: tasks4x100 } = makeLocales(4, 100)
  const { tasks: tasks8x100 } = makeLocales(8, 100)
  const { tasks: tasks4x500 } = makeLocales(4, 500)

  bench('4 locales × 100 messages', () => {
    for (const task of tasks4x100) {
      compileCatalog(task.catalog, task.locale, task.allIds, task.sourceLocale)
    }
  })

  bench('8 locales × 100 messages', () => {
    for (const task of tasks8x100) {
      compileCatalog(task.catalog, task.locale, task.allIds, task.sourceLocale)
    }
  })

  bench('4 locales × 500 messages', () => {
    for (const task of tasks4x500) {
      compileCatalog(task.catalog, task.locale, task.allIds, task.sourceLocale)
    }
  })
})

// ── Parallel multi-locale (worker threads) ──

describe('parallel multi-locale (worker threads)', () => {
  const { tasks: tasks4x100 } = makeLocales(4, 100)
  const { tasks: tasks8x100 } = makeLocales(8, 100)
  const { tasks: tasks4x500 } = makeLocales(4, 500)

  bench('4 locales × 100 messages', async () => {
    await parallelCompile(tasks4x100)
  })

  bench('8 locales × 100 messages', async () => {
    await parallelCompile(tasks8x100)
  })

  bench('4 locales × 500 messages', async () => {
    await parallelCompile(tasks4x500)
  })
})

// ── Concurrency scaling ──

describe('concurrency scaling (8 locales × 200 messages)', () => {
  const { tasks } = makeLocales(8, 200)

  bench('concurrency=1 (sequential)', async () => {
    await parallelCompile(tasks, 1)
  })

  bench('concurrency=2', async () => {
    await parallelCompile(tasks, 2)
  })

  bench('concurrency=4', async () => {
    await parallelCompile(tasks, 4)
  })

  bench('concurrency=auto', async () => {
    await parallelCompile(tasks)
  })
})

// ── Scale test: many locales ──

describe('scale: locale count', () => {
  const { tasks: tasks2 } = makeLocales(2, 200)
  const { tasks: tasks4 } = makeLocales(4, 200)
  const { tasks: tasks8 } = makeLocales(8, 200)
  const { tasks: tasks16 } = makeLocales(16, 200)

  bench('2 locales (parallel)', async () => {
    await parallelCompile(tasks2)
  })

  bench('4 locales (parallel)', async () => {
    await parallelCompile(tasks4)
  })

  bench('8 locales (parallel)', async () => {
    await parallelCompile(tasks8)
  })

  bench('16 locales (parallel)', async () => {
    await parallelCompile(tasks16)
  })
})
