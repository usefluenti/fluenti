/**
 * Custom locale detection plugin.
 * Simulates a real-world scenario: detect locale from a custom HTTP header
 * (e.g., set by an upstream proxy/auth layer based on user profile in DB).
 *
 * Must run before the fluenti runtime plugin so the hook is registered
 * in time for the detection chain.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('fluenti:detect-locale' as never, (ctx: {
    path: string
    locales: string[]
    detectedLocale: string | null
    setLocale: (locale: string) => void
    isServer: boolean
  }) => {
    // Only run on server — client uses payload
    if (!ctx.isServer) return

    // Check for custom header (simulating DB/JWT lookup)
    const event = useRequestEvent()
    if (!event) return
    const customLocale = event.node?.req?.headers?.['x-user-locale'] as string | undefined
    if (customLocale && ctx.locales.includes(customLocale)) {
      ctx.setLocale(customLocale)
    }
  })
})
