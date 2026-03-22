import { defineComponent, h } from 'vue'
import type { ExtractPropTypes } from 'vue'
import { useI18n } from '../use-i18n'
import { extractMessage, reconstruct } from './rich-text'

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
const transProps = {
  /** Override auto-generated hash ID */
  id: String,
  /** Message context used for identity and translator disambiguation */
  context: String,
  /** Translator-facing note preserved in extraction catalogs */
  comment: String,
  /** Wrapper element tag name. Defaults to no wrapper (Fragment). */
  tag: { type: String, default: undefined },
} as const

export type TransProps = Readonly<ExtractPropTypes<typeof transProps>>

export const Trans = defineComponent({
  name: 'Trans',
  props: transProps,
  setup(props, { slots }) {
    const { t } = useI18n()

    return () => {
      const defaultSlot = slots['default']?.()
      if (!defaultSlot) return null
      const { message, components } = extractMessage(defaultSlot)
      const translated = t({
        ...(props.id !== undefined ? { id: props.id } : {}),
        message,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      })
      const result = components.length > 0 ? reconstruct(translated, components) : translated
      if (Array.isArray(result)) {
        if (result.length === 1) return result[0]!
        return props.tag ? h(props.tag, null, result) : result
      }
      return result
    }
  },
})
