import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports'
import { extractLocaleFromPath, localePath } from '../path-utils'
import { runDetectors } from '../detectors'
import type { FluentNuxtRuntimeConfig } from '../../types'

/**
 * Route middleware that redirects users to locale-prefixed URLs
 * based on the locale detection chain (detectors + hook).
 *
 * Only active when strategy is not 'no_prefix'.
 * Skips redirect when the URL already contains a valid locale prefix.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig().public.fluenti as FluentNuxtRuntimeConfig

  if (config.strategy === 'no_prefix') return

  // If the path already has a locale prefix, do nothing
  const { locale: pathLocale } = extractLocaleFromPath(to.path, config.locales)
  if (pathLocale) return

  // For prefix_except_default / prefix_and_default, an unprefixed path
  // means the default locale — no redirect needed for prefix_except_default
  if (config.strategy === 'prefix_except_default') return

  // For 'prefix' strategy, we must redirect to a locale-prefixed URL
  // Run detectors excluding 'path' (since we know path has no locale)
  const configWithoutPath = {
    ...config,
    detectOrder: config.detectOrder.filter((d) => d !== 'path'),
  }
  const detectedLocale = await runDetectors(to.path, configWithoutPath)
  const targetPath = localePath(to.path, detectedLocale, config.defaultLocale, config.strategy)

  if (targetPath !== to.path) {
    return navigateTo(targetPath, { redirectCode: 302 })
  }
})
