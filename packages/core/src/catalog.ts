import type { CompiledMessage, Locale, Messages } from './types'

/**
 * In-memory catalog manager for compiled messages.
 *
 * Supports namespace-aware message IDs (e.g. `'common:greeting'`),
 * locale enumeration, and message lookup with get/set/has operations.
 */
export class Catalog {
  private readonly _catalogs: Record<Locale, Messages> = {}

  /**
   * Retrieve a compiled message by locale and ID.
   * Returns `undefined` if the locale or message ID is not found.
   */
  get(locale: Locale, id: string): CompiledMessage | undefined {
    const messages = this._catalogs[locale]
    if (!messages) return undefined
    return messages[id]
  }

  /**
   * Load messages into the catalog for a given locale.
   * Merges with any existing messages for that locale.
   */
  set(locale: Locale, messages: Messages): void {
    const existing = this._catalogs[locale]
    if (existing) {
      this._catalogs[locale] = { ...existing, ...messages }
    } else {
      this._catalogs[locale] = { ...messages }
    }
  }

  /**
   * Check if a message exists for a given locale and ID.
   */
  has(locale: Locale, id: string): boolean {
    const messages = this._catalogs[locale]
    if (!messages) return false
    return id in messages
  }

  /**
   * Get all locales that have messages loaded.
   */
  getLocales(): Locale[] {
    return Object.keys(this._catalogs)
  }
}
