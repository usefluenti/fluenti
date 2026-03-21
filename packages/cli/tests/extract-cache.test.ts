import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { ExtractCache } from '../src/extract-cache'
import type { ExtractedMessage } from '@fluenti/core'

const TEST_DIR = resolve(tmpdir(), 'fluenti-extract-cache-test-' + Date.now())

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

function writeTestFile(name: string, content: string): string {
  const path = resolve(TEST_DIR, name)
  writeFileSync(path, content, 'utf-8')
  return path
}

const sampleMessages: ExtractedMessage[] = [
  { id: 'hello', message: 'Hello', origin: { file: 'test.ts', line: 1 } },
]

describe('ExtractCache', () => {
  it('returns undefined for uncached files', () => {
    const cache = new ExtractCache(TEST_DIR)
    expect(cache.get('/nonexistent/file.ts')).toBeUndefined()
  })

  it('returns cached messages for unchanged files', () => {
    const filePath = writeTestFile('test.ts', 'const x = 1')
    const cache = new ExtractCache(TEST_DIR)

    cache.set(filePath, sampleMessages)
    cache.save()

    // Create new cache instance (simulates next run)
    const cache2 = new ExtractCache(TEST_DIR)
    const cached = cache2.get(filePath)
    expect(cached).toEqual(sampleMessages)
  })

  it('returns undefined when file content changes', () => {
    const filePath = writeTestFile('test.ts', 'const x = 1')
    const cache = new ExtractCache(TEST_DIR)

    cache.set(filePath, sampleMessages)
    cache.save()

    // Modify file — change size to invalidate
    writeFileSync(filePath, 'const x = 1234567890', 'utf-8')

    const cache2 = new ExtractCache(TEST_DIR)
    expect(cache2.get(filePath)).toBeUndefined()
  })

  it('prunes entries for deleted files', () => {
    const file1 = writeTestFile('a.ts', 'a')
    const file2 = writeTestFile('b.ts', 'b')

    const cache = new ExtractCache(TEST_DIR)
    cache.set(file1, sampleMessages)
    cache.set(file2, sampleMessages)
    expect(cache.size).toBe(2)

    // Prune with only file1 in current set
    cache.prune(new Set([file1]))
    cache.save()

    const cache2 = new ExtractCache(TEST_DIR)
    expect(cache2.get(file1)).toEqual(sampleMessages)
    expect(cache2.get(file2)).toBeUndefined()
  })

  it('handles corrupt cache file gracefully', () => {
    mkdirSync(resolve(TEST_DIR, '.cache'), { recursive: true })
    writeFileSync(resolve(TEST_DIR, '.cache', 'extract-cache.json'), 'NOT JSON', 'utf-8')

    const cache = new ExtractCache(TEST_DIR)
    expect(cache.size).toBe(0)
  })

  it('handles version mismatch gracefully', () => {
    mkdirSync(resolve(TEST_DIR, '.cache'), { recursive: true })
    writeFileSync(
      resolve(TEST_DIR, '.cache', 'extract-cache.json'),
      JSON.stringify({ version: '0', entries: { 'a.ts': { mtime: 0, size: 0, messages: [] } } }),
      'utf-8',
    )

    const cache = new ExtractCache(TEST_DIR)
    expect(cache.size).toBe(0) // old version is discarded
  })

  it('creates cache directory if it does not exist', () => {
    const freshDir = resolve(TEST_DIR, 'sub', 'dir')
    const filePath = writeTestFile('test.ts', 'x')
    const cache = new ExtractCache(freshDir)
    cache.set(filePath, sampleMessages)
    cache.save()

    expect(existsSync(resolve(freshDir, '.cache', 'extract-cache.json'))).toBe(true)
  })
})

describe('projectId isolation', () => {
  it('same catalogDir with different projectIds creates separate cache files', () => {
    const filePath = writeTestFile('shared.ts', 'const x = 1')

    const cacheA = new ExtractCache(TEST_DIR, 'project-a')
    cacheA.set(filePath, sampleMessages)
    cacheA.save()

    const cacheB = new ExtractCache(TEST_DIR, 'project-b')
    // project-b has not cached anything yet
    expect(cacheB.get(filePath)).toBeUndefined()
    expect(cacheB.size).toBe(0)

    // Verify the files are written to distinct paths
    expect(existsSync(resolve(TEST_DIR, '.cache', 'project-a', 'extract-cache.json'))).toBe(true)
    expect(existsSync(resolve(TEST_DIR, '.cache', 'project-b', 'extract-cache.json'))).toBe(false)

    // project-a can still read its own cache
    const cacheA2 = new ExtractCache(TEST_DIR, 'project-a')
    expect(cacheA2.get(filePath)).toEqual(sampleMessages)
  })

  it('prune only affects own project entries', () => {
    const file1 = writeTestFile('a.ts', 'a')
    const file2 = writeTestFile('b.ts', 'b')

    // Both projects cache both files
    const cacheA = new ExtractCache(TEST_DIR, 'proj-a')
    cacheA.set(file1, sampleMessages)
    cacheA.set(file2, sampleMessages)
    cacheA.save()

    const cacheB = new ExtractCache(TEST_DIR, 'proj-b')
    cacheB.set(file1, sampleMessages)
    cacheB.set(file2, sampleMessages)
    cacheB.save()

    // Prune file2 from project-a only
    const cacheA2 = new ExtractCache(TEST_DIR, 'proj-a')
    cacheA2.prune(new Set([file1]))
    cacheA2.save()

    // project-a lost file2
    const cacheA3 = new ExtractCache(TEST_DIR, 'proj-a')
    expect(cacheA3.get(file1)).toEqual(sampleMessages)
    expect(cacheA3.get(file2)).toBeUndefined()

    // project-b still has both files untouched
    const cacheB2 = new ExtractCache(TEST_DIR, 'proj-b')
    expect(cacheB2.get(file1)).toEqual(sampleMessages)
    expect(cacheB2.get(file2)).toEqual(sampleMessages)
  })

  it('no projectId — backward compatible (same path as before)', () => {
    const filePath = writeTestFile('compat.ts', 'const y = 2')

    const cache = new ExtractCache(TEST_DIR)
    cache.set(filePath, sampleMessages)
    cache.save()

    // Cache file lands at the legacy path (no sub-directory for projectId)
    expect(existsSync(resolve(TEST_DIR, '.cache', 'extract-cache.json'))).toBe(true)

    // A second instance without projectId reads the same cache
    const cache2 = new ExtractCache(TEST_DIR)
    expect(cache2.get(filePath)).toEqual(sampleMessages)
  })
})
