import { defineComponent, computed, h, resolveComponent, type PropType } from 'vue'
import { useLocalePath } from '../composables'

/**
 * Locale-aware wrapper around NuxtLink.
 *
 * Automatically prefixes the `to` prop with the current locale
 * based on the routing strategy. Uses the real NuxtLink component
 * for client-side navigation and prefetching.
 *
 * @example
 * ```vue
 * <NuxtLinkLocale to="/about">About</NuxtLinkLocale>
 * <NuxtLinkLocale to="/about" locale="ja">About (Japanese)</NuxtLinkLocale>
 * ```
 */
export const NuxtLinkLocale = defineComponent({
  name: 'NuxtLinkLocale',
  props: {
    to: {
      type: [String, Object] as PropType<string | { path?: string }>,
      required: true,
    },
    locale: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup(props, { slots, attrs }) {
    const getLocalePath = useLocalePath()

    const localizedTo = computed(() => {
      const path = typeof props.to === 'string' ? props.to : props.to.path ?? '/'
      return getLocalePath(path, props.locale)
    })

    return () => {
      const NuxtLink = resolveComponent('NuxtLink')
      return h(
        NuxtLink,
        { ...attrs, to: localizedTo.value },
        slots,
      )
    }
  },
})
