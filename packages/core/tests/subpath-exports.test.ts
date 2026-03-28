import { describe, it, expect } from 'vitest'

describe('subpath exports', () => {
  describe('@fluenti/core/ssr entry', () => {
    it('exports detectLocale, getSSRLocaleScript, getHydratedLocale', async () => {
      const ssrEntry = await import('../src/ssr-entry')
      expect(ssrEntry.detectLocale).toBeTypeOf('function')
      expect(ssrEntry.getSSRLocaleScript).toBeTypeOf('function')
      expect(ssrEntry.getHydratedLocale).toBeTypeOf('function')
    })
  })

  describe('@fluenti/core/formatters entry', () => {
    it('exports formatNumber, formatDate, formatRelativeTime, and defaults/cache-clearers', async () => {
      const fmtEntry = await import('../src/formatters-entry')
      expect(fmtEntry.formatNumber).toBeTypeOf('function')
      expect(fmtEntry.formatDate).toBeTypeOf('function')
      expect(fmtEntry.formatRelativeTime).toBeTypeOf('function')
      expect(fmtEntry.DEFAULT_NUMBER_FORMATS).toBeDefined()
      expect(fmtEntry.DEFAULT_DATE_FORMATS).toBeDefined()
      expect(fmtEntry.clearNumberFormatCache).toBeTypeOf('function')
      expect(fmtEntry.clearDateFormatCache).toBeTypeOf('function')
      expect(fmtEntry.clearRelativeTimeFormatCache).toBeTypeOf('function')
      expect(fmtEntry.LOCALE_CURRENCY_MAP).toBeDefined()
    })
  })

  describe('main entry exports expected symbols', () => {
    it('exports Catalog, negotiateLocale, parseLocale, isRTL, getDirection, validateLocale, msg, resolvePlural, createFluentiCore, clearAllCaches', async () => {
      const mainEntry = await import('../src/index')
      expect(mainEntry.Catalog).toBeTypeOf('function')
      expect(mainEntry.negotiateLocale).toBeTypeOf('function')
      expect(mainEntry.parseLocale).toBeTypeOf('function')
      expect(mainEntry.isRTL).toBeTypeOf('function')
      expect(mainEntry.getDirection).toBeTypeOf('function')
      expect(mainEntry.validateLocale).toBeTypeOf('function')
      expect(mainEntry.msg).toBeTypeOf('function')
      expect(mainEntry.resolvePlural).toBeTypeOf('function')
      expect(mainEntry.createFluentiCore).toBeTypeOf('function')
      expect(mainEntry.clearAllCaches).toBeTypeOf('function')
    })
  })

  describe('@fluenti/core/internal entry', () => {
    it('exports parser, compiler, interpolation, and utility modules', async () => {
      const internalEntry = await import('../src/internal')
      expect(internalEntry.parse).toBeTypeOf('function')
      expect(internalEntry.compile).toBeTypeOf('function')
      expect(internalEntry.interpolate).toBeTypeOf('function')
      expect(internalEntry.Catalog).toBeTypeOf('function')
      expect(internalEntry.resolvePlural).toBeTypeOf('function')
      expect(internalEntry.createDiagnostics).toBeTypeOf('function')
      expect(internalEntry.LRUCache).toBeTypeOf('function')
      expect(internalEntry.buildICUMessage).toBeTypeOf('function')
      expect(internalEntry.resolveDescriptorId).toBeTypeOf('function')
      expect(internalEntry.hashMessage).toBeTypeOf('function')
      expect(internalEntry.createPluginRunner).toBeTypeOf('function')
      expect(internalEntry.resolveLocaleCodes).toBeTypeOf('function')
      expect(internalEntry.normalizeConfig).toBeTypeOf('function')
    })
  })

  describe('main entry does NOT export heavy modules', () => {
    it('does not export parse, compile, interpolate, formatNumber, formatDate, formatRelativeTime', async () => {
      const mainEntry = await import('../src/index') as Record<string, unknown>
      expect(mainEntry['parse']).toBeUndefined()
      expect(mainEntry['compile']).toBeUndefined()
      expect(mainEntry['interpolate']).toBeUndefined()
      // detectLocale IS still exported from main for backward compat
      expect(mainEntry['detectLocale']).toBeTypeOf('function')
      expect(mainEntry['formatNumber']).toBeUndefined()
      expect(mainEntry['formatDate']).toBeUndefined()
      expect(mainEntry['formatRelativeTime']).toBeUndefined()
    })
  })
})
