import { defineComponent, h } from 'vue'

/**
 * `<Trans>` component for rich text with Vue components.
 *
 * @example
 * ```vue
 * <Trans>
 *   Visit our <a href="/docs">documentation</a> to learn more.
 * </Trans>
 * ```
 *
 * @example
 * ```vue
 * <Trans>
 *   Click <RouterLink to="/next">here</RouterLink> to continue.
 * </Trans>
 * ```
 */
export const Trans = defineComponent({
  name: 'Trans',
  props: {
    /** Wrapper element tag name (default: `span`) */
    tag: { type: String, default: 'span' },
  },
  setup(props, { slots }) {
    return () => {
      const defaultSlot = slots['default']?.()
      if (!defaultSlot) return null
      return defaultSlot.length === 1 ? defaultSlot[0]! : h(props.tag, null, defaultSlot)
    }
  },
})
