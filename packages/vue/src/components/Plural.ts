import { defineComponent, h, computed } from 'vue'
import type { SetupContext } from 'vue'
import { useI18n } from '../use-i18n'

/** Plural category names in a stable order for ICU message building. */
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const

type PluralCategory = (typeof PLURAL_CATEGORIES)[number]

/**
 * Build an ICU plural message string from individual category props.
 *
 * Given `{ zero: "No items", one: "# item", other: "# items" }`,
 * produces `"{count, plural, =0 {No items} one {# item} other {# items}}"`.
 *
 * @internal
 */
function buildICUPluralMessage(
  forms: Partial<Record<PluralCategory, string>> & { other: string },
): string {
  const parts: string[] = []
  for (const cat of PLURAL_CATEGORIES) {
    const text = forms[cat]
    if (text !== undefined) {
      // Map the `zero` prop to ICU `=0` exact match. In ICU MessageFormat,
      // `zero` is a CLDR plural category that only activates in languages
      // with a grammatical zero form (e.g. Arabic). The `=0` exact match
      // works universally for the common "show this when count is 0" intent.
      const key = cat === 'zero' ? '=0' : cat
      parts.push(`${key} {${text}}`)
    }
  }
  return `{count, plural, ${parts.join(' ')}}`
}

/**
 * Resolve which plural category to use for slot-based rendering.
 * Checks for exact =0 match first, then falls back to CLDR rules.
 * @internal
 */
function resolveCategory(
  value: number,
  locale: string,
  available: (cat: PluralCategory) => boolean,
): PluralCategory {
  if (value === 0 && available('zero')) return 'zero'
  const cldr = new Intl.PluralRules(locale).select(value) as PluralCategory
  if (available(cldr)) return cldr
  return 'other'
}

/**
 * `<Plural>` component — shorthand for ICU plural patterns.
 *
 * Plural form props (`zero`, `one`, `two`, `few`, `many`, `other`) are treated
 * as source-language messages. The component builds an ICU plural message,
 * looks it up via `t()` in the catalog, and interpolates the translated result.
 *
 * When no catalog translation exists, the component falls back to interpolating
 * the source-language ICU message directly via the `message` field of the
 * MessageDescriptor.
 *
 * Rich text is supported via named slots:
 * ```vue
 * <Plural :value="count">
 *   <template #zero>No <strong>items</strong></template>
 *   <template #one><em>1</em> item</template>
 *   <template #other><strong>{{ count }}</strong> items</template>
 * </Plural>
 * ```
 *
 * String props still work (backward compatible):
 * ```vue
 * <Plural :value="count" zero="No items" one="# item" other="# items" />
 * ```
 */
export const Plural = defineComponent({
  name: 'Plural',
  props: {
    /** The numeric value to pluralise on */
    value: { type: Number, required: true },
    /** Text for zero items (maps to `=0`) */
    zero: String,
    /** Text for singular (maps to `one`) */
    one: String,
    /** Text for dual (maps to `two`) */
    two: String,
    /** Text for few (maps to `few`) */
    few: String,
    /** Text for many (maps to `many`) */
    many: String,
    /** Text for the default/other category */
    other: { type: String, default: undefined },
    /** Wrapper element tag name (default: `span`) */
    tag: { type: String, default: 'span' },
  },
  setup(props, { slots }: SetupContext) {
    const { t, locale } = useI18n()

    const text = computed(() => {
      const forms: Partial<Record<PluralCategory, string>> & { other: string } = {
        ...(props.zero !== undefined && { zero: props.zero }),
        ...(props.one !== undefined && { one: props.one }),
        ...(props.two !== undefined && { two: props.two }),
        ...(props.few !== undefined && { few: props.few }),
        ...(props.many !== undefined && { many: props.many }),
        other: props.other ?? '',
      }

      // Build the ICU message key from source-language props
      const icuMessage = buildICUPluralMessage(forms)

      // Use MessageDescriptor form: if the catalog has a translation for this
      // ICU key, it is used; otherwise the source ICU message is the fallback.
      // In both cases, `t()` interpolates the values into the ICU plural pattern.
      return t(
        { id: icuMessage, message: icuMessage },
        { count: props.value },
      )
    })

    return () => {
      const hasSlots = PLURAL_CATEGORIES.some(cat => slots[cat])
      if (hasSlots) {
        const cat = resolveCategory(props.value, locale.value, c => !!slots[c])
        const slotFn = slots[cat] ?? slots['other']
        return h(props.tag, null, slotFn?.({ count: props.value }))
      }
      // Existing string-prop ICU path (unchanged)
      return h(props.tag, null, text.value)
    }
  },
})
