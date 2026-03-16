import { defineComponent, h } from 'vue'
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
export const NumberFormat = defineComponent({
  name: 'NumberFormat',
  props: {
    value: { type: Number, required: true },
    style: { type: String, default: undefined },
    tag: { type: String, default: 'span' },
  },
  setup(props) {
    const { n } = useI18n()
    return () => h(props.tag, n(props.value, props.style))
  },
})
