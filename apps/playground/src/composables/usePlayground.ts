import { ref, computed, watch } from 'vue'
import { extractMessages, type SourceLanguage, type ExtractedMessage } from '../lib/extract'
import { buildCatalog, writeJsonCatalog, writePoCatalog } from '../lib/catalog'
import { compileCatalog } from '../lib/compile'
import { transformCode } from '../lib/transform'
import { presets } from '../lib/presets'

export function usePlayground() {
  const language = ref<SourceLanguage>(presets[0]!.language)
  const code = ref(presets[0]!.code)
  const locale = ref('en')

  // Debounce processing to avoid flash during typing
  const debouncedCode = ref(code.value)
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  watch(code, (val) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedCode.value = val
    }, 150)
  })

  // ─── Extraction ───────────────────────────────────────────────────────────

  const extractionResult = computed(() => {
    try {
      const messages = extractMessages(debouncedCode.value, language.value)
      return { messages, error: null }
    } catch (e) {
      return { messages: [] as ExtractedMessage[], error: e instanceof Error ? e.message : 'Extraction failed' }
    }
  })

  const extractedMessages = computed(() => extractionResult.value.messages)
  const extractionError = computed(() => extractionResult.value.error)

  // ─── Catalog ──────────────────────────────────────────────────────────────

  const catalog = computed(() => buildCatalog(extractedMessages.value))

  const jsonOutput = computed(() => {
    try {
      return writeJsonCatalog(catalog.value)
    } catch {
      return '// JSON generation failed'
    }
  })

  const poOutput = computed(() => {
    try {
      return writePoCatalog(catalog.value)
    } catch {
      return '# PO generation failed'
    }
  })

  // ─── Compiled output ─────────────────────────────────────────────────────

  const compiledDefault = computed(() => {
    try {
      return compileCatalog(catalog.value, locale.value)
    } catch (e) {
      return `// Compilation failed: ${e instanceof Error ? e.message : 'unknown error'}`
    }
  })

  // ─── Transform preview ───────────────────────────────────────────────────

  const transformedCode = computed(() => {
    try {
      return transformCode(debouncedCode.value, language.value)
    } catch (e) {
      return `// Transform failed: ${e instanceof Error ? e.message : 'unknown error'}`
    }
  })

  return {
    language,
    code,
    extractedMessages,
    extractionError,
    jsonOutput,
    poOutput,
    compiledDefault,
    compiledSplit: compiledDefault,
    transformedCode,
  }
}
