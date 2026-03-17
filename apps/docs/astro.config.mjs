import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  server: { port: 8321 },
  redirects: {
    '/getting-started/introduction/': '/start/introduction/',
    '/getting-started/quick-start-vue/': '/start/quick-start-vue/',
    '/getting-started/quick-start-react/': '/start/quick-start-react/',
    '/getting-started/quick-start-solid/': '/start/quick-start-solid/',
    '/getting-started/quick-start-nuxt/': '/start/quick-start-nuxt/',
    '/getting-started/quick-start-nextjs/': '/start/quick-start-nextjs/',
    '/getting-started/quick-start-react-router/': '/start/quick-start-react-router/',
    '/getting-started/quick-start-solidstart/': '/start/quick-start-solidstart/',
    '/getting-started/quick-start-tanstack-start/': '/start/quick-start-tanstack-start/',
    '/guides/how-it-works/': '/start/how-it-works/',
    '/guides/translating-content/': '/essentials/translating-content/',
    '/guides/components/': '/essentials/translating-content/',
    '/guides/message-format/': '/essentials/message-format/',
    '/guides/formatting/': '/essentials/formatting/',
    '/guides/locale-switching/': '/essentials/locale-switching/',
    '/guides/v-t-directive/': '/frameworks/vue/v-t-directive/',
    '/guides/migration-from-vue-i18n/': '/frameworks/vue/migration-from-vue-i18n/',
    '/guides/vue-i18n-bridge/': '/frameworks/vue/vue-i18n-bridge/',
    '/guides/custom-locale-detection/': '/frameworks/nuxt/locale-detection/',
    '/guides/ssr/': '/advanced/ssr-hydration/',
    '/guides/best-practices/': '/advanced/best-practices/',
    '/frameworks/nuxt/routing/': '/frameworks/nuxt/setup-and-routing/',
  },
  integrations: [
    starlight({
      title: 'Fluenti',
      description: 'Compile-time i18n for modern frameworks',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/usefluenti/fluenti',
        },
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Introduction', slug: 'start/introduction' },
            { label: 'How It Works', slug: 'start/how-it-works' },
            {
              label: 'Quick Start',
              items: [
                { label: 'Overview', slug: 'start/quick-start' },
                { label: 'Vue', slug: 'start/quick-start-vue' },
                { label: 'React', slug: 'start/quick-start-react' },
                { label: 'SolidJS', slug: 'start/quick-start-solid' },
                { label: 'Nuxt', slug: 'start/quick-start-nuxt' },
                { label: 'Next.js', slug: 'start/quick-start-nextjs' },
                { label: 'React Router', slug: 'start/quick-start-react-router' },
                { label: 'SolidStart', slug: 'start/quick-start-solidstart' },
                { label: 'TanStack Start', slug: 'start/quick-start-tanstack-start' },
              ],
            },
          ],
        },
        {
          label: 'Essentials',
          items: [
            { label: 'Translating Content', slug: 'essentials/translating-content' },
            { label: 'Message Format', slug: 'essentials/message-format' },
            { label: 'Formatting', slug: 'essentials/formatting' },
            { label: 'Locale Switching', slug: 'essentials/locale-switching' },
            { label: 'Configuration', slug: 'essentials/configuration' },
            { label: 'CLI Usage', slug: 'essentials/cli' },
          ],
        },
        {
          label: 'Vue',
          collapsed: true,
          items: [
            { label: 'v-t Directive', slug: 'frameworks/vue/v-t-directive' },
            { label: 'SSR', slug: 'frameworks/vue/ssr' },
            { label: 'Migration from vue-i18n', slug: 'frameworks/vue/migration-from-vue-i18n' },
            { label: 'vue-i18n Bridge', slug: 'frameworks/vue/vue-i18n-bridge' },
          ],
        },
        {
          label: 'React',
          collapsed: true,
          items: [
            { label: 'React SPA', slug: 'frameworks/react/react-spa' },
            { label: 'Next.js', slug: 'frameworks/react/nextjs' },
            { label: 'Server Components', slug: 'frameworks/react/server-components' },
            { label: 'React Router', slug: 'frameworks/react/react-router' },
            { label: 'TanStack Start', slug: 'frameworks/react/tanstack-start' },
          ],
        },
        {
          label: 'Solid',
          collapsed: true,
          items: [
            { label: 'SolidJS SPA', slug: 'frameworks/solid/solid-spa' },
            { label: 'SolidStart', slug: 'frameworks/solid/solidstart' },
            { label: 'SSR', slug: 'frameworks/solid/ssr' },
          ],
        },
        {
          label: 'Nuxt',
          collapsed: true,
          items: [
            { label: 'Setup & Routing', slug: 'frameworks/nuxt/setup-and-routing' },
            { label: 'SSR, SSG & ISR', slug: 'frameworks/nuxt/ssr-ssg-isr' },
            { label: 'Custom Locale Detection', slug: 'frameworks/nuxt/locale-detection' },
          ],
        },
        {
          label: 'Advanced',
          collapsed: true,
          items: [
            { label: 'Code Splitting', slug: 'advanced/code-splitting' },
            { label: 'SSR & Hydration', slug: 'advanced/ssr-hydration' },
            { label: 'Fallback Chains', slug: 'advanced/fallback-chains' },
            { label: 'Best Practices', slug: 'advanced/best-practices' },
          ],
        },
        {
          label: 'API Reference',
          collapsed: true,
          items: [
            { label: '@fluenti/core', slug: 'api/core' },
            { label: '@fluenti/vue', slug: 'api/vue' },
            { label: '@fluenti/react', slug: 'api/react' },
            { label: '@fluenti/solid', slug: 'api/solid' },
            { label: '@fluenti/cli', slug: 'api/cli' },
            { label: '@fluenti/vite-plugin', slug: 'api/vite-plugin' },
            { label: '@fluenti/next', slug: 'api/next' },
            { label: '@fluenti/nuxt', slug: 'api/nuxt' },
            { label: '@fluenti/vue-i18n-compat', slug: 'api/vue-i18n-compat' },
            { label: 'Configuration', slug: 'api/config' },
          ],
        },
        { label: 'Examples', slug: 'examples' },
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        Header: './src/components/Header.astro',
        Hero: './src/components/Hero.astro',
        Footer: './src/components/Footer.astro',
      },
    }),
  ],
})
