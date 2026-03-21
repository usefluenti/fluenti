import type { LocaleDetectContext } from '../../types'
import type { DomainConfig } from '../../types'

/**
 * Detect locale from the request hostname.
 *
 * Matches the current host against the `domains` config to determine locale.
 * Only active when `strategy: 'domains'` is configured.
 */
export default function detectDomain(ctx: LocaleDetectContext): void {
  if (ctx.strategy !== 'domains') return
  if (!ctx.host) return

  // Access domains from the runtime config injected by the module
  const domains = (ctx as unknown as { domains?: DomainConfig[] }).domains
  if (!domains?.length) return

  const host = ctx.host.toLowerCase().replace(/:\d+$/, '') // strip port

  for (const entry of domains) {
    if (entry.domain.toLowerCase() === host) {
      ctx.setLocale(entry.locale)
      return
    }
  }
}
