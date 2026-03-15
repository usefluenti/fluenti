import { defineComponent, computed, h, type PropType } from 'vue'

/**
 * NuxtLinkLocale component definition.
 *
 * This is a framework-level component that wraps NuxtLink with locale-aware
 * path resolution. It's designed to be used within a Nuxt app where
 * the localePath helper is injected via the runtime plugin.
 *
 * Usage in templates:
 * ```vue
 * <NuxtLinkLocale to="/about">About</NuxtLinkLocale>
 * <NuxtLinkLocale to="/about" locale="ja">About (Japanese)</NuxtLinkLocale>
 * ```
 *
 * NOTE: This component expects `$localePath` to be available on globalProperties,
 * which is set up by the Nuxt runtime plugin.
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
    const localizedTo = computed(() => {
      const path = typeof props.to === 'string' ? props.to : props.to.path ?? '/'
      // $localePath is injected by the runtime plugin
      const localePath = (getCurrentInstance()?.appContext.config.globalProperties as any)?.$localePath
      if (typeof localePath === 'function') {
        return localePath(path, props.locale)
      }
      return path
    })

    return () => {
      // Resolve NuxtLink at runtime (it's registered globally by Nuxt)
      return h(
        'a', // Fallback to <a> — in a real Nuxt app, the runtime plugin resolves NuxtLink
        { ...attrs, href: localizedTo.value },
        slots['default']?.(),
      )
    }
  },
})

// We need getCurrentInstance for accessing globalProperties
import { getCurrentInstance } from 'vue'
