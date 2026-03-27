/**
 * Per-component locale isolation for RSC.
 *
 * Temporarily switches the request-scoped locale, executes a function,
 * then restores the previous locale. This allows rendering a subtree in
 * a different locale without affecting the rest of the page.
 *
 * @param locale - The locale to switch to for the duration of `fn`.
 * @param fn - The function to execute with the switched locale.
 * @param serverModule - The generated server module reference (auto-injected
 *   by the webpack loader in production; only needed when calling manually).
 * @returns The return value of `fn`.
 *
 * @example Basic usage in a Server Component
 * ```tsx
 * // app/page.tsx (Server Component)
 * import { withLocale } from '@fluenti/next/server'
 *
 * export default async function Page() {
 *   return (
 *     <div>
 *       <h1>{t`Main content`}</h1>
 *       {await withLocale('ja', async () => (
 *         <JapaneseWidget />
 *       ))}
 *       <Footer />
 *     </div>
 *   )
 * }
 * ```
 *
 * @example Rendering a multilingual page section
 * ```tsx
 * import { withLocale } from '@fluenti/next/server'
 *
 * export default async function MultilingualPage() {
 *   const englishContent = await withLocale('en', async () => (
 *     <p>{t`Welcome`}</p>
 *   ))
 *   const japaneseContent = await withLocale('ja', async () => (
 *     <p>{t`Welcome`}</p>
 *   ))
 *   return (
 *     <div>
 *       {englishContent}
 *       {japaneseContent}
 *     </div>
 *   )
 * }
 * ```
 */
export async function withLocale<T>(
  locale: string,
  fn: () => T | Promise<T>,
  serverModule?: { setLocale: (l: string) => void; getI18n: () => Promise<unknown> },
): Promise<T> {
  if (!serverModule) {
    throw new Error(
      '[fluenti] withLocale requires a server module reference. ' +
        'Pass the generated server module as the third argument: ' +
        'withLocale("ja", fn, serverI18n)',
    )
  }

  // Read current locale from the module's request store
  // We need to save/restore state. Since we can't access the store directly,
  // we use setLocale to switch and rely on the caller to restore.
  const prevInstance = await serverModule.getI18n()
  const prevLocale = (prevInstance as { locale: string }).locale

  try {
    serverModule.setLocale(locale)
    // Force instance recreation by calling getI18n again
    await serverModule.getI18n()
    return await fn()
  } finally {
    serverModule.setLocale(prevLocale)
    await serverModule.getI18n()
  }
}
