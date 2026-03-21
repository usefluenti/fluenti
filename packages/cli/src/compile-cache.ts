import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'

/** Cache format version — bump when the structure changes */
const CACHE_VERSION = '1'

interface CompileCacheEntry {
  inputHash: string
}

interface CompileCacheData {
  version: string
  entries: Record<string, CompileCacheEntry> // keyed by locale
}

/**
 * Compile cache that skips re-compilation when PO/JSON files haven't changed.
 *
 * Uses MD5 of input file content as change detection (non-cryptographic, fast).
 */
export class CompileCache {
  private data: CompileCacheData
  private cachePath: string
  private dirty = false

  constructor(catalogDir: string, projectId?: string) {
    const cacheDir = projectId
      ? resolve(catalogDir, '.cache', projectId)
      : resolve(catalogDir, '.cache')
    this.cachePath = resolve(cacheDir, 'compile-cache.json')
    this.data = this.load()
  }

  /**
   * Check if a locale's catalog has changed since last compile.
   * Returns true if unchanged (cache hit), false if re-compilation needed.
   */
  isUpToDate(locale: string, catalogContent: string): boolean {
    const entry = this.data.entries[locale]
    if (!entry) return false

    const currentHash = hashContent(catalogContent)
    return entry.inputHash === currentHash
  }

  /**
   * Update the cache after a successful compilation.
   */
  set(locale: string, catalogContent: string): void {
    this.data.entries[locale] = {
      inputHash: hashContent(catalogContent),
    }
    this.dirty = true
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

  private load(): CompileCacheData {
    try {
      if (existsSync(this.cachePath)) {
        const raw = readFileSync(this.cachePath, 'utf-8')
        const parsed = JSON.parse(raw) as CompileCacheData
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

function hashContent(content: string): string {
  return createHash('md5').update(content).digest('hex')
}
