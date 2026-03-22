/**
 * Virtual module resolution for code-splitting mode.
 *
 * Provides:
 * - virtual:fluenti/runtime    → reactive catalog + switchLocale + preloadLocale
 * - virtual:fluenti/messages   → re-export from static locale (for static strategy)
 * - virtual:fluenti/route-runtime → per-route splitting runtime
 */

import { resolve } from 'node:path'
import { validateLocale } from '@fluenti/core'
import type { RuntimeGenerator, RuntimeGeneratorOptions } from './types'

/**
 * Escapes a string value for safe embedding in generated JavaScript code.
 * Returns a JSON-encoded string (with double quotes), preventing injection
 * of quotes, backticks, template interpolation, and other special characters.
 */
function safeStringLiteral(value: string): string {
  return JSON.stringify(value)
}

/**
 * Validates that a catalog directory path does not contain characters
 * that could enable code injection in generated template literals.
 */
function validateCatalogDir(catalogDir: string): void {
  if (catalogDir.includes('`') || catalogDir.includes('$')) {
    throw new Error(
      `[fluenti] vite-plugin: catalogDir must not contain backticks or $ characters, got ${JSON.stringify(catalogDir)}`,
    )
  }
}

const VIRTUAL_RUNTIME = 'virtual:fluenti/runtime'
const VIRTUAL_MESSAGES = 'virtual:fluenti/messages'
const VIRTUAL_ROUTE_RUNTIME = 'virtual:fluenti/route-runtime'
const RESOLVED_RUNTIME = '\0virtual:fluenti/runtime'
const RESOLVED_MESSAGES = '\0virtual:fluenti/messages'
const RESOLVED_ROUTE_RUNTIME = '\0virtual:fluenti/route-runtime'

export interface VirtualModuleOptions {
  rootDir: string
  catalogDir: string
  catalogExtension: string
  locales: string[]
  sourceLocale: string
  defaultBuildLocale: string
  framework: string
  runtimeGenerator?: RuntimeGenerator | undefined
}

export function resolveVirtualSplitId(id: string): string | undefined {
  if (id === VIRTUAL_RUNTIME) return RESOLVED_RUNTIME
  if (id === VIRTUAL_MESSAGES) return RESOLVED_MESSAGES
  if (id === VIRTUAL_ROUTE_RUNTIME) return RESOLVED_ROUTE_RUNTIME
  return undefined
}

export function loadVirtualSplitModule(
  id: string,
  options: VirtualModuleOptions,
): string | undefined {
  if (id === RESOLVED_RUNTIME) {
    return generateRuntimeModule(options)
  }
  if (id === RESOLVED_MESSAGES) {
    return generateStaticMessagesModule(options)
  }
  if (id === RESOLVED_ROUTE_RUNTIME) {
    return generateRouteRuntimeModule(options)
  }
  return undefined
}

function generateRuntimeModule(options: VirtualModuleOptions): string {
  const { locales, runtimeGenerator, catalogDir } = options
  validateCatalogDir(catalogDir)
  for (const locale of locales) {
    validateLocale(locale, 'vite-plugin')
  }

  if (!runtimeGenerator) {
    throw new Error('[fluenti] vite-plugin: runtimeGenerator is required. Use a framework-specific plugin (e.g. @fluenti/vue/vite-plugin).')
  }

  return runtimeGenerator.generateRuntime(toRuntimeGeneratorOptions(options))
}

function generateStaticMessagesModule(options: VirtualModuleOptions): string {
  const { rootDir, catalogDir, catalogExtension, defaultBuildLocale, sourceLocale } = options
  const defaultLocale = defaultBuildLocale || sourceLocale
  validateLocale(defaultLocale, 'vite-plugin')
  validateCatalogDir(catalogDir)
  const absoluteCatalogDir = resolve(rootDir, catalogDir)

  return `export * from ${safeStringLiteral(absoluteCatalogDir + '/' + defaultLocale + catalogExtension)}\n`
}

/**
 * Generate the route runtime module for per-route splitting.
 */
export function generateRouteRuntimeModule(options: VirtualModuleOptions): string {
  const { locales, runtimeGenerator, catalogDir } = options
  validateCatalogDir(catalogDir)
  for (const locale of locales) {
    validateLocale(locale, 'vite-plugin')
  }

  if (!runtimeGenerator) {
    throw new Error('[fluenti] vite-plugin: runtimeGenerator is required. Use a framework-specific plugin (e.g. @fluenti/vue/vite-plugin).')
  }

  return runtimeGenerator.generateRouteRuntime(toRuntimeGeneratorOptions(options))
}

function toRuntimeGeneratorOptions(options: VirtualModuleOptions): RuntimeGeneratorOptions {
  const { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale } = options
  return { rootDir, catalogDir, catalogExtension, locales, sourceLocale, defaultBuildLocale }
}

