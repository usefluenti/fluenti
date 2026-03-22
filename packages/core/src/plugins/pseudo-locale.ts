import type { FluentiPlugin } from '../types'

/** Character mapping for pseudo-localization */
const PSEUDO_MAP: Record<string, string> = {
  a: '\u00e4', // ä
  b: '\u0183', // ƃ
  c: '\u00e7', // ç
  d: '\u0111', // đ
  e: '\u00eb', // ë
  f: '\u0192', // ƒ
  g: '\u011f', // ğ
  h: '\u0127', // ħ
  i: '\u00ef', // ï
  j: '\u0135', // ĵ
  k: '\u0137', // ķ
  l: '\u013c', // ļ
  m: '\u1e3f', // ḿ
  n: '\u00f1', // ñ
  o: '\u00f6', // ö
  p: '\u00fe', // þ
  q: '\u01a3', // ƣ
  r: '\u0155', // ŕ
  s: '\u0161', // š
  t: '\u0163', // ţ
  u: '\u00fc', // ü
  v: '\u1e7d', // ṽ
  w: '\u0175', // ŵ
  x: '\u1e8b', // ẋ
  y: '\u00ff', // ÿ
  z: '\u017e', // ž
  A: '\u00c4', // Ä
  B: '\u0182', // Ƃ
  C: '\u00c7', // Ç
  D: '\u0110', // Đ
  E: '\u00cb', // Ë
  F: '\u0191', // Ƒ
  G: '\u011e', // Ğ
  H: '\u0126', // Ħ
  I: '\u00cf', // Ï
  J: '\u0134', // Ĵ
  K: '\u0136', // Ķ
  L: '\u013b', // Ļ
  M: '\u1e3e', // Ḿ
  N: '\u00d1', // Ñ
  O: '\u00d6', // Ö
  P: '\u00de', // Þ
  Q: '\u01a2', // Ƣ
  R: '\u0154', // Ŕ
  S: '\u0160', // Š
  T: '\u0162', // Ţ
  U: '\u00dc', // Ü
  V: '\u1e7c', // Ṽ
  W: '\u0174', // Ŵ
  X: '\u1e8a', // Ẋ
  Y: '\u00dd', // Ý
  Z: '\u017d', // Ž
}

export interface PseudoLocaleOptions {
  /** Locale code for the pseudo-locale (default: 'pseudo') */
  locale?: string
}

/**
 * Pseudo-localize a single string, preserving ICU syntax (`{...}` blocks).
 * Wraps the result in brackets for visual testing of i18n coverage.
 */
export function pseudoLocalize(text: string): string {
  let result = ''
  let depth = 0

  for (const char of text) {
    if (char === '{') {
      depth++
      result += char
    } else if (char === '}') {
      depth = Math.max(0, depth - 1)
      result += char
    } else if (depth > 0) {
      // Inside ICU block — preserve as-is
      result += char
    } else {
      result += PSEUDO_MAP[char] ?? char
    }
  }

  return `[${result}]`
}

/**
 * Creates a plugin that generates pseudo-localized strings for UI testing.
 *
 * Transforms ASCII characters into accented equivalents and wraps
 * messages in brackets. This helps verify:
 * - All user-visible strings are translated (untranslated text stands out)
 * - UI layouts handle longer text (pseudo-localized text is ~30% longer)
 * - Character encoding works correctly
 *
 * @example
 * ```ts
 * import { pseudoLocalePlugin } from '@fluenti/core'
 *
 * export default defineConfig({
 *   plugins: [pseudoLocalePlugin({ locale: 'pseudo' })],
 * })
 * // "Hello" → "[Ħëļļö]"
 * ```
 */
export function pseudoLocalePlugin(options?: PseudoLocaleOptions): FluentiPlugin {
  const targetLocale = options?.locale ?? 'pseudo'

  return {
    name: 'fluenti:pseudo-locale',

    transformMessages(
      messages: Readonly<Record<string, string>>,
      locale: string,
    ): Record<string, string> {
      if (locale !== targetLocale) return { ...messages }

      const result: ExtractedMessages = {}
      for (const [id, message] of Object.entries(messages)) {
        result[id] = pseudoLocalize(message)
      }
      return result
    },
  }
}
