import { detectLocale } from '@fluenti/core'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('request', (event) => {
    const cookieHeader = getRequestHeader(event, 'cookie') ?? ''
    const localeCookie = parseCookieLocale(cookieHeader)

    const queryLocale = getQuery(event)['locale'] as string | undefined

    const detected = detectLocale({
      available: ['en', 'ja'],
      fallback: 'en',
      cookie: localeCookie,
      query: queryLocale,
      headers: {
        'accept-language': getRequestHeader(event, 'accept-language') ?? '',
      },
    })

    // Store detected locale in event context for SSR rendering
    event.context['locale'] = detected
  })
})

function parseCookieLocale(cookieHeader: string): string | undefined {
  const match = cookieHeader.match(/(?:^|;\s*)fluenti_locale=([^;]+)/)
  return match?.[1]
}
