import { createRuntimeGenerator } from '@fluenti/vite-plugin'
import type { RuntimeGenerator } from '@fluenti/vite-plugin'

export const solidRuntimeGenerator: RuntimeGenerator = createRuntimeGenerator({
  imports: `import { createSignal } from 'solid-js'\nimport { createStore, reconcile } from 'solid-js/store'`,
  catalogInit: 'const [__catalog, __setCatalog] = createStore({ ...__defaultMsgs })',
  localeInit: (defaultLocale) => `const [__currentLocale, __setCurrentLocale] = createSignal('${defaultLocale}')`,
  loadingInit: 'const [__loading, __setLoading] = createSignal(false)',
  catalogUpdate: (msgs) => `__setCatalog(reconcile(${msgs}))`,
  catalogMerge: (msgs) => `__setCatalog(reconcile({ ...__catalog, ...${msgs} }))`,
  localeUpdate: (locale) => `__setCurrentLocale(${locale})`,
  loadingUpdate: (value) => `__setLoading(${value})`,
  localeRead: '__currentLocale()',
  runtimeKey: 'fluenti.runtime.solid.v1',
})
