#!/usr/bin/env node
/**
 * Dist-level smoke test — validates built output in real Node.js ESM runtime.
 *
 * Run AFTER `pnpm build`. Does NOT use Vitest (Vite transform would mask
 * Rolldown packaging bugs). Imports directly from dist files.
 *
 * Exit 0 = all checks pass. Exit 1 = any check failed.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'

let passed = 0
let failed = 0

function pass(label) {
  console.log(`${GREEN}✓${RESET} ${label}`)
  passed++
}

function fail(label, err) {
  console.error(`${RED}✗${RESET} ${label}`)
  console.error(`  ${err?.message ?? err}`)
  failed++
}

// ---------------------------------------------------------------------------
// Test 1: @fluenti/core/config — dist/config.js importable as ESM
// ---------------------------------------------------------------------------
let configMod
try {
  configMod = await import(join(root, 'packages/core/dist/config.js'))
  pass('@fluenti/core/config dist/config.js imports as ESM')
} catch (err) {
  fail('@fluenti/core/config dist/config.js imports as ESM', err)
}

// ---------------------------------------------------------------------------
// Test 2: loadConfigSync reads fixture data — not silent fallback defaults
// The catch block in loadConfigSync returns defaultConfig on error.
// If jiti / createRequire is broken, it silently returns { locales: ['en'] }.
// This test detects that silent failure.
// ---------------------------------------------------------------------------
let tmpDir
try {
  tmpDir = join(tmpdir(), `fluenti-smoke-${process.pid}`)
  mkdirSync(tmpDir, { recursive: true })
  writeFileSync(
    join(tmpDir, 'fluenti.config.mjs'),
    `export default { locales: ['en', 'ja'], sourceLocale: 'en' }\n`,
  )

  const config = configMod.loadConfigSync(undefined, tmpDir)
  if (!config.locales.includes('ja')) {
    throw new Error(
      `loadConfigSync returned locales=${JSON.stringify(config.locales)} — expected 'ja'. ` +
      'Silent catch swallowed jiti error and returned defaults.',
    )
  }
  pass('loadConfigSync reads fixture data (not silent fallback defaults)')
} catch (err) {
  fail('loadConfigSync reads fixture data (not silent fallback defaults)', err)
} finally {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Test 3: @fluenti/next — dist/index.js exports withFluenti
// ---------------------------------------------------------------------------
try {
  const mod = await import(join(root, 'packages/next-plugin/dist/index.js'))
  if (typeof mod.withFluenti !== 'function') {
    throw new TypeError(`withFluenti is ${typeof mod.withFluenti}, expected function`)
  }
  pass('@fluenti/next dist/index.js → withFluenti is a function')
} catch (err) {
  fail('@fluenti/next dist/index.js → withFluenti is a function', err)
}

// ---------------------------------------------------------------------------
// Test 4: @fluenti/next/middleware — dist/middleware.js exports createI18nMiddleware
// ---------------------------------------------------------------------------
try {
  const mod = await import(join(root, 'packages/next-plugin/dist/middleware.js'))
  if (typeof mod.createI18nMiddleware !== 'function') {
    throw new TypeError(`createI18nMiddleware is ${typeof mod.createI18nMiddleware}, expected function`)
  }
  pass('@fluenti/next/middleware dist/middleware.js → createI18nMiddleware is a function')
} catch (err) {
  fail('@fluenti/next/middleware dist/middleware.js → createI18nMiddleware is a function', err)
}

// ---------------------------------------------------------------------------
// Test 5: @fluenti/next/server — dist/server.js exports withLocale
// (navigation.js is 'use client' and imports next/navigation, which requires
// the Next.js webpack runtime — not importable in plain Node.js)
// ---------------------------------------------------------------------------
try {
  const mod = await import(join(root, 'packages/next-plugin/dist/server.js'))
  if (typeof mod.withLocale !== 'function') {
    throw new TypeError(`withLocale is ${typeof mod.withLocale}, expected function`)
  }
  pass('@fluenti/next/server dist/server.js → withLocale is a function')
} catch (err) {
  fail('@fluenti/next/server dist/server.js → withLocale is a function', err)
}

// ---------------------------------------------------------------------------
// Test 6: @fluenti/react — dist/index.js exports I18nProvider
// ---------------------------------------------------------------------------
try {
  const mod = await import(join(root, 'packages/react/dist/index.js'))
  if (typeof mod.I18nProvider !== 'function') {
    throw new TypeError(`I18nProvider is ${typeof mod.I18nProvider}, expected function`)
  }
  pass('@fluenti/react dist/index.js → I18nProvider is a function')
} catch (err) {
  fail('@fluenti/react dist/index.js → I18nProvider is a function', err)
}

// ---------------------------------------------------------------------------
// Test 7: @fluenti/vite-plugin — dist/index.js exports createFluentiPlugins
// ---------------------------------------------------------------------------
try {
  const mod = await import(join(root, 'packages/vite-plugin/dist/index.js'))
  if (typeof mod.createFluentiPlugins !== 'function') {
    throw new TypeError(`createFluentiPlugins is ${typeof mod.createFluentiPlugins}, expected function`)
  }
  pass('@fluenti/vite-plugin dist/index.js → createFluentiPlugins is a function')
} catch (err) {
  fail('@fluenti/vite-plugin dist/index.js → createFluentiPlugins is a function', err)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('')
const total = passed + failed
if (failed === 0) {
  console.log(`${GREEN}All ${total} smoke tests passed.${RESET}`)
  process.exit(0)
} else {
  console.error(`${RED}${failed} of ${total} smoke tests FAILED.${RESET}`)
  process.exit(1)
}
