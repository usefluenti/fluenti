import { createRuntimeGenerator } from '@fluenti/vite-plugin'
import type { RuntimeGenerator } from '@fluenti/vite-plugin'

export const vueRuntimeGenerator: RuntimeGenerator = createRuntimeGenerator({
  imports: `import { shallowReactive, ref } from 'vue'`,
  catalogInit: 'const __catalog = shallowReactive({ ...__defaultMsgs })',
  localeInit: (defaultLocale) => `const __currentLocale = ref('${defaultLocale}')`,
  loadingInit: 'const __loading = ref(false)',
  catalogUpdate: (msgs) => `Object.assign(__catalog, ${msgs})`,
  localeUpdate: (locale) => `__currentLocale.value = ${locale}`,
  loadingUpdate: (value) => `__loading.value = ${value}`,
  localeRead: '__currentLocale.value',
  runtimeKey: 'fluenti.runtime.vue.v1',
})
