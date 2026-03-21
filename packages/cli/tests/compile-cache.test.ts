import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { CompileCache } from '../src/compile-cache'

const TEST_DIR = resolve(tmpdir(), 'fluenti-compile-cache-test-' + Date.now())

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('CompileCache', () => {
  it('returns false for uncached locales', () => {
    const cache = new CompileCache(TEST_DIR)
    expect(cache.isUpToDate('ja', 'some content')).toBe(false)
  })

  it('returns true when catalog content is unchanged', () => {
    const content = 'msgid "hello"\nmsgstr "こんにちは"'
    const cache = new CompileCache(TEST_DIR)
    cache.set('ja', content)
    cache.save()

    const cache2 = new CompileCache(TEST_DIR)
    expect(cache2.isUpToDate('ja', content)).toBe(true)
  })

  it('returns false when catalog content changes', () => {
    const content1 = 'msgid "hello"\nmsgstr "こんにちは"'
    const content2 = 'msgid "hello"\nmsgstr "こんにちは！"'

    const cache = new CompileCache(TEST_DIR)
    cache.set('ja', content1)
    cache.save()

    const cache2 = new CompileCache(TEST_DIR)
    expect(cache2.isUpToDate('ja', content2)).toBe(false)
  })

  it('handles multiple locales independently', () => {
    const jaContent = 'ja content'
    const zhContent = 'zh content'

    const cache = new CompileCache(TEST_DIR)
    cache.set('ja', jaContent)
    cache.set('zh', zhContent)
    cache.save()

    const cache2 = new CompileCache(TEST_DIR)
    expect(cache2.isUpToDate('ja', jaContent)).toBe(true)
    expect(cache2.isUpToDate('zh', zhContent)).toBe(true)
    expect(cache2.isUpToDate('ja', 'changed')).toBe(false)
  })

  it('handles corrupt cache file gracefully', () => {
    mkdirSync(resolve(TEST_DIR, '.cache'), { recursive: true })
    writeFileSync(resolve(TEST_DIR, '.cache', 'compile-cache.json'), '{CORRUPT', 'utf-8')

    const cache = new CompileCache(TEST_DIR)
    expect(cache.isUpToDate('ja', 'anything')).toBe(false)
  })

  it('handles version mismatch', () => {
    mkdirSync(resolve(TEST_DIR, '.cache'), { recursive: true })
    writeFileSync(
      resolve(TEST_DIR, '.cache', 'compile-cache.json'),
      JSON.stringify({ version: '0', entries: { ja: { inputHash: 'abc' } } }),
      'utf-8',
    )

    const cache = new CompileCache(TEST_DIR)
    expect(cache.isUpToDate('ja', 'anything')).toBe(false)
  })

  it('creates cache directory if needed', () => {
    const freshDir = resolve(TEST_DIR, 'deep', 'nested')
    const cache = new CompileCache(freshDir)
    cache.set('en', 'content')
    cache.save()

    expect(existsSync(resolve(freshDir, '.cache', 'compile-cache.json'))).toBe(true)
  })

  it('does not write when no changes made', () => {
    const cache = new CompileCache(TEST_DIR)
    cache.save() // no set() calls

    expect(existsSync(resolve(TEST_DIR, '.cache', 'compile-cache.json'))).toBe(false)
  })
})

describe('projectId isolation', () => {
  it('same catalogDir with different projectIds creates separate cache files', () => {
    const content = 'msgid "hello"\nmsgstr "こんにちは"'

    const cacheA = new CompileCache(TEST_DIR, 'project-a')
    cacheA.set('ja', content)
    cacheA.save()

    // project-b has no data — should not see project-a's entry
    const cacheB = new CompileCache(TEST_DIR, 'project-b')
    expect(cacheB.isUpToDate('ja', content)).toBe(false)

    // Verify distinct file paths on disk
    expect(existsSync(resolve(TEST_DIR, '.cache', 'project-a', 'compile-cache.json'))).toBe(true)
    expect(existsSync(resolve(TEST_DIR, '.cache', 'project-b', 'compile-cache.json'))).toBe(false)

    // project-a can still read its own entry
    const cacheA2 = new CompileCache(TEST_DIR, 'project-a')
    expect(cacheA2.isUpToDate('ja', content)).toBe(true)
  })

  it('no projectId — backward compatible (same path as before)', () => {
    const content = 'msgid "hi"\nmsgstr "やあ"'

    const cache = new CompileCache(TEST_DIR)
    cache.set('ja', content)
    cache.save()

    // Cache file lands at the legacy path (no sub-directory for projectId)
    expect(existsSync(resolve(TEST_DIR, '.cache', 'compile-cache.json'))).toBe(true)

    // A second instance without projectId reads the same cache
    const cache2 = new CompileCache(TEST_DIR)
    expect(cache2.isUpToDate('ja', content)).toBe(true)
  })
})
