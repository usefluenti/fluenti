import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { ExtractedMessage } from '@fluenti/core'

/** Cache format version — bump when the structure changes */
const CACHE_VERSION = '1'

interface ExtractCacheEntry {
  mtime: number
  size: number
  messages: ExtractedMessage[]
}

interface ExtractCacheData {
  version: string
  entries: Record<string, ExtractCacheEntry>
}

/**
 * File-level extract cache that skips re-extraction for unchanged files.
 *
 * Cache is keyed by file path, with mtime + size as change detection.
 */
export class ExtractCache {
  private data: ExtractCacheData
  private cachePath: string
  private dirty = false

  constructor(catalogDir: string, projectId?: string) {
    const cacheDir = projectId
      ? resolve(catalogDir, '.cache', projectId)
      : resolve(catalogDir, '.cache')
    this.cachePath = resolve(cacheDir, 'extract-cache.json')
    this.data = this.load()
  }

  /**
   * Check if a file has changed since the last extraction.
   * Returns cached messages if unchanged, undefined if re-extraction needed.
   */
  get(filePath: string): ExtractedMessage[] | undefined {
    const entry = this.data.entries[filePath]
    if (!entry) return undefined

    try {
      const stat = statSync(filePath)
      if (stat.mtimeMs === entry.mtime && stat.size === entry.size) {
        return entry.messages
      }
    } catch {
      // File no longer exists or can't be stat'd — cache miss
    }

    return undefined
  }

  /**
   * Update the cache for a file after extraction.
   */
  set(filePath: string, messages: ExtractedMessage[]): void {
    try {
      const stat = statSync(filePath)
      this.data.entries[filePath] = {
        mtime: stat.mtimeMs,
        size: stat.size,
        messages,
      }
      this.dirty = true
    } catch {
      // File doesn't exist — skip caching
    }
  }

  /**
   * Remove entries for files that no longer exist in the file list.
   */
  prune(currentFiles: Set<string>): void {
    for (const filePath of Object.keys(this.data.entries)) {
      if (!currentFiles.has(filePath)) {
        delete this.data.entries[filePath]
        this.dirty = true
      }
    }
  }

  /**
   * Write the cache to disk if any changes were made.
   */
  save(): void {
    if (!this.dirty) return

    mkdirSync(dirname(this.cachePath), { recursive: true })
    writeFileSync(this.cachePath, JSON.stringify(this.data), 'utf-8')
    this.dirty = false
  }

  /** Number of cached entries */
  get size(): number {
    return Object.keys(this.data.entries).length
  }

  private load(): ExtractCacheData {
    try {
      if (existsSync(this.cachePath)) {
        const raw = readFileSync(this.cachePath, 'utf-8')
        const parsed = JSON.parse(raw) as ExtractCacheData
        if (parsed.version === CACHE_VERSION) {
          return parsed
        }
      }
    } catch {
      // Corrupt or unreadable cache — start fresh
    }

    return { version: CACHE_VERSION, entries: {} }
  }
}
