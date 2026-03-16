import { defineComponent, h } from 'vue'
import { useI18n } from '../use-i18n'

/**
 * `<DateTime>` component for formatting dates according to locale.
 *
 * @example
 * ```vue
 * <DateTime :value="new Date()" />
 * <DateTime :value="Date.now()" style="short" />
 * <DateTime :value="event.date" style="long" tag="time" />
 * ```
 */
export const DateTime = defineComponent({
  name: 'DateTime',
  props: {
    value: { type: [Date, Number], required: true },
    style: { type: String, default: undefined },
    tag: { type: String, default: 'span' },
  },
  setup(props) {
    const { d } = useI18n()
    return () => h(props.tag, d(props.value as Date | number, props.style))
  },
})
