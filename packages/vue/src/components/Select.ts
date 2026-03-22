import { defineComponent, h } from 'vue'
import type { ExtractPropTypes, PropType, SetupContext, VNodeChild } from 'vue'
import { hashMessage } from '@fluenti/core'
import { useI18n } from '../use-i18n'
import { buildICUSelectMessage, normalizeSelectForms } from '@fluenti/core'
import { reconstruct, serializeRichForms } from './rich-text'

/**
 * `<Select>` component — shorthand for ICU select patterns.
 *
 * Accepts a `value` string that selects among named options. Options can be
 * provided via the type-safe `options` prop (recommended), as direct attrs
 * (convenience), or as named slots (rich text).
 *
 * Falls back to `other` when no match is found.
 *
 * @example Type-safe usage (recommended):
 * ```vue
 * <Select
 *   :value="gender"
 *   :options="{ male: 'He liked it', female: 'She liked it' }"
 *   other="They liked it"
 * />
 * ```
 *
 * @example Rich text via named slots:
 * ```vue
 * <Select :value="gender">
 *   <template #male><strong>He</strong> liked this</template>
 *   <template #female><strong>She</strong> liked this</template>
 *   <template #other><em>They</em> liked this</template>
 * </Select>
 * ```
 */
const selectProps = {
  /** The value to select on (e.g. `"male"`, `"female"`) */
  value: { type: String, required: true },
  /** Override the auto-generated synthetic ICU message id */
  id: String,
  /** Message context used for identity and translator disambiguation */
  context: String,
  /** Translator-facing note preserved in extraction catalogs */
  comment: String,
  /** Fallback text when no option matches `value` */
  other: { type: String, required: true },
  /**
   * Named options map. Keys are match values, values are display strings.
   * Takes precedence over attrs when both are provided.
   *
   * @example `{ male: 'He', female: 'She' }`
   */
  options: {
    type: Object as PropType<Record<string, string>>,
    default: undefined,
  },
  /** Wrapper element tag name. Defaults to no wrapper (Fragment). */
  tag: { type: String, default: undefined },
} as const

export type SelectProps = Readonly<ExtractPropTypes<typeof selectProps>>

export const Select = defineComponent({
  name: 'Select',
  inheritAttrs: false,
  props: selectProps,
  setup(props, { attrs, slots }: SetupContext) {
    const { t } = useI18n()

    return () => {
      const forms: Record<string, VNodeChild | undefined> = {}

      if (props.options !== undefined) {
        for (const [key, value] of Object.entries(props.options)) {
          forms[key] = value
        }
        forms['other'] = props.other
      } else {
        for (const [key, value] of Object.entries(attrs)) {
          if (typeof value === 'string') {
            forms[key] = value
          }
        }
        forms['other'] = props.other
      }

      for (const [key, slot] of Object.entries(slots)) {
        if (key === 'default' || !slot) continue
        forms[key] = slot({ value: '{value}' })
      }

      const orderedKeys = [...Object.keys(forms).filter(key => key !== 'other'), 'other'] as const
      const { messages, components } = serializeRichForms(orderedKeys, forms)
      const normalized = normalizeSelectForms(
        Object.fromEntries(
          [...orderedKeys].map((key) => [key, messages[key] ?? '']),
        ),
      )
      const icuMessage = buildICUSelectMessage(normalized.forms)
      const translated = t(
        {
          id: props.id ?? (props.context === undefined ? icuMessage : hashMessage(icuMessage, props.context)),
          message: icuMessage,
          ...(props.context !== undefined ? { context: props.context } : {}),
          ...(props.comment !== undefined ? { comment: props.comment } : {}),
        },
        { value: normalized.valueMap[props.value] ?? 'other' },
      )
      const result = components.length > 0 ? reconstruct(translated, components) : translated
      if (props.tag) return h(props.tag, undefined, result ?? undefined)
      return result ?? null
    }
  },
})
