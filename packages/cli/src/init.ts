import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import consola from 'consola'

const LOCALE_PATTERN = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/

export function validateLocale(locale: string): string {
  if (!LOCALE_PATTERN.test(locale)) {
    throw new Error(`Invalid locale format: "${locale}"`)
  }
  return locale
}

export interface DetectedFramework {
  name: 'nextjs' | 'nuxt' | 'vue' | 'solid' | 'solidstart' | 'react' | 'unknown'
  pluginPackage: string | null
}

const FRAMEWORK_DETECTION: Array<{
  dep: string
  name: DetectedFramework['name']
  pluginPackage: string
}> = [
  { dep: 'next', name: 'nextjs', pluginPackage: '@fluenti/next' },
  { dep: 'nuxt', name: 'nuxt', pluginPackage: '@fluenti/vue' },
  { dep: '@solidjs/start', name: 'solidstart', pluginPackage: '@fluenti/vite-plugin' },
  { dep: 'vue', name: 'vue', pluginPackage: '@fluenti/vite-plugin' },
  { dep: 'solid-js', name: 'solid', pluginPackage: '@fluenti/vite-plugin' },
  { dep: 'react', name: 'react', pluginPackage: '@fluenti/vite-plugin' },
]

/**
 * Detect the framework from package.json dependencies.
 */
export function detectFramework(deps: Record<string, string>): DetectedFramework {
  for (const entry of FRAMEWORK_DETECTION) {
    if (entry.dep in deps) {
      return { name: entry.name, pluginPackage: entry.pluginPackage }
    }
  }
  return { name: 'unknown', pluginPackage: null }
}

/**
 * Generate fluenti.config.ts content.
 */
export function generateFluentiConfig(opts: {
  sourceLocale: string
  locales: string[]
  format: 'po' | 'json'
}): string {
  const localesList = opts.locales.map((l) => `'${l}'`).join(', ')
  return `import { defineConfig } from '@fluenti/cli'

export default defineConfig({
  sourceLocale: '${opts.sourceLocale}',
  locales: [${localesList}],
  catalogDir: './locales',
  format: '${opts.format}',
  include: ['./src/**/*.{vue,tsx,jsx,ts,js}'],
  compileOutDir: './src/locales/compiled',
})
`
}

/**
 * Interactive init flow.
 */
export async function runInit(options: { cwd: string }): Promise<void> {
  const pkgPath = resolve(options.cwd, 'package.json')
  if (!existsSync(pkgPath)) {
    consola.error('No package.json found in current directory.')
    return
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  const framework = detectFramework(allDeps)

  consola.info(`Detected framework: ${framework.name}`)
  if (framework.pluginPackage) {
    consola.info(`Recommended plugin: ${framework.pluginPackage}`)
  }

  // Check if config already exists
  const configPath = resolve(options.cwd, 'fluenti.config.ts')
  if (existsSync(configPath)) {
    consola.warn('fluenti.config.ts already exists. Skipping config generation.')
    return
  }

  // Prompt for configuration
  const sourceLocale = await consola.prompt('Source locale?', {
    type: 'text',
    default: 'en',
    placeholder: 'en',
  }) as unknown as string

  if (typeof sourceLocale === 'symbol') return // user cancelled

  const targetLocalesInput = await consola.prompt('Target locales (comma-separated)?', {
    type: 'text',
    default: 'ja,zh-CN',
    placeholder: 'ja,zh-CN',
  }) as unknown as string

  if (typeof targetLocalesInput === 'symbol') return

  const format = await consola.prompt('Catalog format?', {
    type: 'select',
    options: ['po', 'json'],
    initial: 'po',
  }) as unknown as string

  if (typeof format === 'symbol') return

  const targetLocales = targetLocalesInput.split(',').map((l) => l.trim()).filter(Boolean)

  // Validate locale formats
  validateLocale(sourceLocale)
  for (const locale of targetLocales) {
    validateLocale(locale)
  }

  const allLocales = [sourceLocale, ...targetLocales.filter((l) => l !== sourceLocale)]

  // Write config
  const configContent = generateFluentiConfig({
    sourceLocale,
    locales: allLocales,
    format: format as 'po' | 'json',
  })
  writeFileSync(configPath, configContent, 'utf-8')
  consola.success('Created fluenti.config.ts')

  // Append to .gitignore
  const gitignorePath = resolve(options.cwd, '.gitignore')
  const gitignoreEntry = 'src/locales/compiled/'
  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf-8')
    if (!existing.includes(gitignoreEntry)) {
      appendFileSync(gitignorePath, `\n# Fluenti compiled catalogs\n${gitignoreEntry}\n`)
      consola.success('Updated .gitignore')
    }
  } else {
    writeFileSync(gitignorePath, `# Fluenti compiled catalogs\n${gitignoreEntry}\n`)
    consola.success('Created .gitignore')
  }

  // Patch package.json scripts
  const existingScripts = pkg.scripts ?? {}
  const newScripts: Record<string, string> = {}
  let scriptsChanged = false
  if (!existingScripts['i18n:extract']) {
    newScripts['i18n:extract'] = 'fluenti extract'
    scriptsChanged = true
  }
  if (!existingScripts['i18n:compile']) {
    newScripts['i18n:compile'] = 'fluenti compile'
    scriptsChanged = true
  }
  if (scriptsChanged) {
    const updatedPkg = {
      ...pkg,
      scripts: { ...existingScripts, ...newScripts },
    }
    writeFileSync(pkgPath, JSON.stringify(updatedPkg, null, 2) + '\n', 'utf-8')
    consola.success('Added i18n:extract and i18n:compile scripts to package.json')
  }

  // Print next steps
  consola.log('')
  consola.box({
    title: 'Next steps',
    message: [
      framework.pluginPackage
        ? `1. Install: pnpm add -D ${framework.pluginPackage} @fluenti/cli`
        : '1. Install: pnpm add -D @fluenti/cli',
      framework.name === 'nextjs'
        ? '2. Add withFluenti() to your next.config.ts'
        : framework.name !== 'unknown'
          ? '2. Add fluentiPlugin() to your vite.config.ts'
          : '2. Configure your build tool to use @fluenti/vite-plugin or @fluenti/next',
      '3. Run: npx fluenti extract',
      '4. Translate your messages',
      '5. Run: npx fluenti compile',
    ].join('\n'),
  })
}
