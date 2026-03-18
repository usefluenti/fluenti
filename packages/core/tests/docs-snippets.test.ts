import { describe, expect, it } from 'vitest'
import { scopeTransform } from '../src/scope-transform'
import { docsSnippetFixtures } from './fixtures/docs-snippets'

describe('docs snippet fixtures', () => {
  for (const fixture of docsSnippetFixtures) {
    it(`keeps the documented ${fixture.name} path valid`, () => {
      const result = scopeTransform(fixture.code, fixture.options)

      expect(result.transformed).toBe(fixture.expected.transformed)

      for (const needle of fixture.expected.contains ?? []) {
        expect(result.code).toContain(needle)
      }

      for (const needle of fixture.expected.excludes ?? []) {
        expect(result.code).not.toContain(needle)
      }
    })
  }
})
