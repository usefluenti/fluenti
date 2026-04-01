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
    it('exports defineConfig, Catalog, negotiateLocale, parseLocale, isRTL, getDirection, validateLocale, msg, resolvePlural, createFluentiCore, clearAllCaches', async () => {
      const mainEntry = await import('../src/index')
      expect(mainEntry.defineConfig).toBeTypeOf('function')
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

  describe('@fluenti/core/runtime entry', () => {
    it('exports runtime interpolation, formatter, and component helpers', async () => {
      const runtimeEntry = await import('../src/runtime')
      expect(runtimeEntry.interpolate).toBeTypeOf('function')
      expect(runtimeEntry.Catalog).toBeTypeOf('function')
      expect(runtimeEntry.resolvePlural).toBeTypeOf('function')
      expect(runtimeEntry.createDiagnostics).toBeTypeOf('function')
      expect(runtimeEntry.buildICUMessage).toBeTypeOf('function')
      expect(runtimeEntry.buildICUPluralMessage).toBeTypeOf('function')
      expect(runtimeEntry.buildICUSelectMessage).toBeTypeOf('function')
      expect(runtimeEntry.normalizeSelectForms).toBeTypeOf('function')
      expect(runtimeEntry.hashMessage).toBeTypeOf('function')
      expect(runtimeEntry.resolveDescriptorId).toBeTypeOf('function')
      expect(runtimeEntry.formatDate).toBeTypeOf('function')
      expect(runtimeEntry.formatNumber).toBeTypeOf('function')
      expect(runtimeEntry.formatRelativeTime).toBeTypeOf('function')
    })
  })

  describe('@fluenti/core/compiler entry', () => {
    it('exports parser, compiler, and build tooling helpers', async () => {
      const compilerEntry = await import('../src/compiler')
      expect(compilerEntry.parse).toBeTypeOf('function')
      expect(compilerEntry.compile).toBeTypeOf('function')
      expect(compilerEntry.createPluginRunner).toBeTypeOf('function')
      expect(compilerEntry.resolveLocaleCodes).toBeTypeOf('function')
      expect(compilerEntry.normalizeConfig).toBeTypeOf('function')
      expect(compilerEntry.hashMessage).toBeTypeOf('function')
      expect(compilerEntry.LRUCache).toBeTypeOf('function')
      expect(compilerEntry.createDiagnostics).toBeTypeOf('function')
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
