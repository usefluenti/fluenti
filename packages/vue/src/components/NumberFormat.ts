import { defineComponent, h } from 'vue'
import type { ExtractPropTypes } from 'vue'
import { useI18n } from '../use-i18n'

/**
 * `<NumberFormat>` component for formatting numbers according to locale.
 *
 * @example
 * ```vue
 * <NumberFormat :value="1234.56" />
 * <NumberFormat :value="0.75" format="percent" />
 * <NumberFormat :value="99.99" format="currency" tag="strong" />
 * ```
 */
const numberFormatProps = {
  value: { type: Number, required: true },
  format: { type: String, default: undefined },
  tag: { type: String, default: 'span' },
} as const

export type FluentiNumberFormatProps = Readonly<ExtractPropTypes<typeof numberFormatProps>>

export const NumberFormat = /* @__PURE__ */ defineComponent({
  name: 'NumberFormat',
  props: numberFormatProps,
  setup(props) {
    const { n } = useI18n()
    return () => h(props.tag, n(props.value, props.format))
  },
})
