import { cookies } from 'next/headers'

/**
 * Custom locale resolver for Server Actions and other contexts
 * where FluentProvider doesn't run.
 *
 * This example reads from a cookie, but you could also:
 * - Query a database for the user's locale preference
 * - Decode a JWT token
 * - Call an external API
 */
export default async function resolveLocale(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.get('locale')?.value ?? 'en'
}
