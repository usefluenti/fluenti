import { bench, describe } from 'vitest'
import { Catalog } from '../src/catalog'
import { generateCatalog } from './_helpers'

const sizes = [100, 1_000, 10_000] as const

for (const size of sizes) {
  describe(`catalog (${size.toLocaleString()} messages)`, () => {
    const catalog = new Catalog()
    const messages = generateCatalog(size)
    catalog.set('en', messages)

    const midKey = `msg_${Math.floor(size / 2)}`
    const lastKey = `msg_${size - 1}`

    bench('get — first entry', () => {
      catalog.get('en', 'msg_0')
    })

    bench('get — middle entry', () => {
      catalog.get('en', midKey)
    })

    bench('get — last entry', () => {
      catalog.get('en', lastKey)
    })

    bench('has — existing key', () => {
      catalog.has('en', midKey)
    })

    bench('has — missing key', () => {
      catalog.has('en', 'nonexistent_key')
    })

    bench('has — missing locale', () => {
      catalog.has('fr', 'msg_0')
    })

    bench('set — merge 10 messages', () => {
      const patch = generateCatalog(10)
      catalog.set('en', patch)
    })
  })
}
