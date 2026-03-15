import { defineComponent, h, computed } from 'vue'
import type { PropType, SetupContext } from 'vue'
import { useI18n } from '../use-i18n'

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
export const Select = defineComponent({
  name: 'Select',
  inheritAttrs: false,
  props: {
    /** The value to select on (e.g. `"male"`, `"female"`) */
    value: { type: String, required: true },
    /** Fallback text when no option matches `value` */
    other: { type: String, default: undefined },
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
    /** Wrapper element tag name (default: `span`) */
    tag: { type: String, default: 'span' },
  },
  setup(props, { attrs, slots }: SetupContext) {
    useI18n() // ensure plugin is installed

    const text = computed(() => {
      // options prop takes precedence over attrs
      if (props.options !== undefined) {
        const match = props.options[props.value]
        if (typeof match === 'string') {
          return match
        }
        return props.other ?? ''
      }

      // Fall back to attrs for backwards compatibility
      if (props.value in attrs && typeof attrs[props.value] === 'string') {
        return attrs[props.value] as string
      }
      return props.other ?? ''
    })

    return () => {
      // Check for named slots matching the value or 'other'
      const hasSlots = !!slots[props.value] || !!slots['other']
      if (hasSlots) {
        const slotFn = slots[props.value] ?? slots['other']
        return h(props.tag, null, slotFn?.({ value: props.value }))
      }
      // Existing string path (unchanged)
      return h(props.tag, null, text.value)
    }
  },
})
