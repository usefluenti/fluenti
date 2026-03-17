/**
 * Global tagged template function transformed by @fluenti/vite-plugin.
 * Transforms `t`message`` into compiled i18n calls at build time.
 *
 * @deprecated Prefer `const { t } = useI18n()` which provides the same
 * tagged template support without a magic global. The plugin will optimize
 * tagged templates via AST scope analysis when `t` comes from `useI18n()`.
 */
declare function t(strings: TemplateStringsArray, ...values: unknown[]): string
