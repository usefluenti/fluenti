import { defineComponent, h } from 'vue'
import type { ExtractPropTypes, SetupContext, VNodeChild } from 'vue'
import { hashMessage, buildICUPluralMessage, PLURAL_CATEGORIES, type PluralCategory } from '@fluenti/core'
import { useI18n } from '../use-i18n'
import { reconstruct, serializeRichForms } from './rich-text'

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
const pluralProps = {
  /** The numeric value to pluralise on */
  value: { type: Number, required: true },
  /** Override the auto-generated synthetic ICU message id */
  id: String,
  /** Message context used for identity and translator disambiguation */
  context: String,
  /** Translator-facing note preserved in extraction catalogs */
  comment: String,
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
  other: { type: String, required: true },
  /** Offset from value before selecting form */
  offset: Number,
  /** Wrapper element tag name. Defaults to no wrapper (Fragment). */
  tag: { type: String, default: undefined },
} as const

export type PluralProps = Readonly<ExtractPropTypes<typeof pluralProps>>

export const Plural = defineComponent({
  name: 'Plural',
  props: pluralProps,
  setup(props, { slots }: SetupContext) {
    const { t } = useI18n()

    return () => {
      const forms: Partial<Record<PluralCategory, VNodeChild>> & Record<string, VNodeChild | undefined> = {
        zero: props.zero,
        one: props.one,
        two: props.two,
        few: props.few,
        many: props.many,
        other: props.other,
      }

      for (const cat of PLURAL_CATEGORIES) {
        const slot = slots[cat]
        if (slot) {
          forms[cat] = slot({ count: '#' })
        }
      }

      const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, forms)
      const icuMessage = buildICUPluralMessage(
        {
          ...(messages['zero'] !== undefined && { zero: messages['zero'] }),
          ...(messages['one'] !== undefined && { one: messages['one'] }),
          ...(messages['two'] !== undefined && { two: messages['two'] }),
          ...(messages['few'] !== undefined && { few: messages['few'] }),
          ...(messages['many'] !== undefined && { many: messages['many'] }),
          other: messages['other'] ?? '',
        },
        props.offset,
      )
      const translated = t(
        {
          id: props.id ?? (props.context === undefined ? icuMessage : hashMessage(icuMessage, props.context)),
          message: icuMessage,
          ...(props.context !== undefined ? { context: props.context } : {}),
          ...(props.comment !== undefined ? { comment: props.comment } : {}),
        },
        { count: props.value },
      )

      const result = components.length > 0 ? reconstruct(translated, components) : translated
      if (props.tag) return h(props.tag, undefined, result ?? undefined)
      return result ?? null
    }
  },
})
