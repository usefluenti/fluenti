import { defineComponent, h } from 'vue'
import type { ExtractPropTypes } from 'vue'
import { useI18n } from '../use-i18n'

/**
 * `<NumberFormat>` component for formatting numbers according to locale.
 *
 * @example
 * ```vue
 * <NumberFormat :value="1234.56" />
 * <NumberFormat :value="0.75" style="percent" />
 * <NumberFormat :value="99.99" style="currency" tag="strong" />
 * ```
 */
const numberFormatProps = {
  value: { type: Number, required: true },
  style: { type: String, default: undefined },
  tag: { type: String, default: 'span' },
} as const

export type NumberFormatProps = Readonly<ExtractPropTypes<typeof numberFormatProps>>

export const NumberFormat = defineComponent({
  name: 'NumberFormat',
  props: numberFormatProps,
  setup(props) {
    const { n } = useI18n()
    return () => h(props.tag, n(props.value, props.style))
  },
})
