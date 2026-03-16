/**
 * Global tagged template function injected by @fluenti/vite-plugin.
 * Transforms `t`message`` into `__i18n.t('message')` at build time.
 */
declare function t(strings: TemplateStringsArray, ...values: unknown[]): string
