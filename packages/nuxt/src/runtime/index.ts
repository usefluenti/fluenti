// Path utilities (pure functions, framework-agnostic)
export { localePath, extractLocaleFromPath, switchLocalePath } from './path-utils'

// Page route extension (build-time utility)
export { extendPages } from './page-extend'
export type { PageRoute } from './page-extend'

// Locale head (pure function)
export { buildLocaleHead } from './locale-head'
export type { LocaleHeadMeta, LocaleHeadOptions } from './locale-head'

// Nuxt composables (zero-argument, auto-inject from Nuxt context)
export { useLocalePath, useSwitchLocalePath, useLocaleHead } from './composables'

// Component
export { NuxtLinkLocale } from './components/NuxtLinkLocale'
