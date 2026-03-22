import { createRuntimeGenerator } from '@fluenti/vite-plugin'
import type { RuntimeGenerator } from '@fluenti/vite-plugin'

export const reactRuntimeGenerator: RuntimeGenerator = createRuntimeGenerator({
  imports: '',
  catalogInit: 'const __catalog = { ...__defaultMsgs }',
  localeInit: (defaultLocale) => `let __currentLocale = '${defaultLocale}'`,
  loadingInit: 'let __loading = false',
  catalogUpdate: (msgs) => `Object.assign(__catalog, ${msgs})`,
  localeUpdate: (locale) => `__currentLocale = ${locale}`,
  loadingUpdate: (value) => `__loading = ${value}`,
  localeRead: '__currentLocale',
  runtimeKey: 'fluenti.runtime.react.v1',
})
