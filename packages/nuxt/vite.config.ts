import { createPackageConfig } from '../../scripts/vite-config-factory'

export default createPackageConfig({
  entry: {
    module: 'src/module.ts',
    'runtime/index': 'src/runtime/index.ts',
    'runtime/plugin': 'src/runtime/plugin.ts',
    'runtime/client': 'src/runtime/client.ts',
    'runtime/composables': 'src/runtime/composables.ts',
    'runtime/components/NuxtLinkLocale': 'src/runtime/components/NuxtLinkLocale.ts',
    'runtime/middleware/locale-redirect': 'src/runtime/middleware/locale-redirect.ts',
    'runtime/server/locale-redirect': 'src/runtime/server/locale-redirect.ts',
    'runtime/standalone-composables': 'src/runtime/standalone-composables.ts',
    'runtime/define-i18n-route': 'src/runtime/define-i18n-route.ts',
    'runtime/detectors/domain': 'src/runtime/detectors/domain.ts',
  },
  external: ['vue', 'vue-router', 'nuxt', 'nuxt/app', '#app', '#components', '#imports', '@nuxt/kit', '@fluenti/core', '@fluenti/vue', '@fluenti/vue/vite-plugin', '@fluenti/vite-plugin', 'h3', /^node:/],
  testEnv: 'node',
  coverage: { lines: 70, branches: 65, functions: 70, statements: 70 },
})
