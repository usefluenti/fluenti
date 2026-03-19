import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import fg from 'fast-glob'
import consola from 'consola'
import type { AIProvider } from './translate'

const execFileAsync = promisify(execFile)

export type SupportedLibrary =
  | 'vue-i18n'
  | 'nuxt-i18n'
  | 'react-i18next'
  | 'next-intl'
  | 'next-i18next'
  | 'lingui'

interface LibraryInfo {
  name: SupportedLibrary
  framework: string
  configPatterns: string[]
  localePatterns: string[]
  sourcePatterns: string[]
  migrationGuide: string // relative path from packages/
}

const LIBRARY_INFO: Record<SupportedLibrary, LibraryInfo> = {
  'vue-i18n': {
    name: 'vue-i18n',
    framework: 'Vue',
    configPatterns: ['i18n.ts', 'i18n.js', 'i18n/index.ts', 'i18n/index.js', 'src/i18n.ts', 'src/i18n.js', 'src/i18n/index.ts', 'src/plugins/i18n.ts'],
    localePatterns: ['locales/*.json', 'src/locales/*.json', 'i18n/*.json', 'src/i18n/*.json', 'lang/*.json', 'src/lang/*.json', 'locales/*.yaml', 'locales/*.yml'],
    sourcePatterns: ['src/**/*.vue'],
    migrationGuide: 'vue/llms-migration.txt',
  },
  'nuxt-i18n': {
    name: 'nuxt-i18n',
    framework: 'Nuxt',
    configPatterns: ['nuxt.config.ts', 'nuxt.config.js', 'i18n.config.ts', 'i18n.config.js'],
    localePatterns: ['locales/*.json', 'lang/*.json', 'i18n/*.json', 'locales/*.yaml', 'locales/*.yml'],
    sourcePatterns: ['pages/**/*.vue', 'components/**/*.vue', 'layouts/**/*.vue'],
    migrationGuide: 'nuxt/llms-migration.txt',
  },
  'react-i18next': {
    name: 'react-i18next',
    framework: 'React',
    configPatterns: ['i18n.ts', 'i18n.js', 'src/i18n.ts', 'src/i18n.js', 'src/i18n/index.ts', 'src/i18n/config.ts'],
    localePatterns: ['locales/*.json', 'src/locales/*.json', 'public/locales/**/*.json', 'translations/*.json', 'src/translations/*.json'],
    sourcePatterns: ['src/**/*.tsx', 'src/**/*.jsx', 'src/**/*.ts'],
    migrationGuide: 'react/llms-migration.txt',
  },
  'next-intl': {
    name: 'next-intl',
    framework: 'Next.js',
    configPatterns: ['next.config.ts', 'next.config.js', 'next.config.mjs', 'i18n.ts', 'src/i18n.ts', 'i18n/request.ts', 'src/i18n/request.ts'],
    localePatterns: ['messages/*.json', 'locales/*.json', 'src/messages/*.json', 'src/locales/*.json'],
    sourcePatterns: ['app/**/*.tsx', 'src/app/**/*.tsx', 'pages/**/*.tsx', 'components/**/*.tsx'],
    migrationGuide: 'next-plugin/llms-migration.txt',
  },
  'next-i18next': {
    name: 'next-i18next',
    framework: 'Next.js',
    configPatterns: ['next-i18next.config.js', 'next-i18next.config.mjs', 'next.config.ts', 'next.config.js'],
    localePatterns: ['public/locales/**/*.json'],
    sourcePatterns: ['pages/**/*.tsx', 'src/pages/**/*.tsx', 'components/**/*.tsx', 'src/components/**/*.tsx'],
    migrationGuide: 'next-plugin/llms-migration.txt',
  },
  'lingui': {
    name: 'lingui',
    framework: 'React',
    configPatterns: ['lingui.config.ts', 'lingui.config.js', '.linguirc'],
    localePatterns: ['locales/*.po', 'src/locales/*.po', 'locales/*/messages.po', 'src/locales/*/messages.po'],
    sourcePatterns: ['src/**/*.tsx', 'src/**/*.jsx', 'src/**/*.ts'],
    migrationGuide: 'react/llms-migration.txt',
  },
}

const SUPPORTED_NAMES = Object.keys(LIBRARY_INFO) as SupportedLibrary[]

export function resolveLibrary(from: string): SupportedLibrary | undefined {
  const normalized = from.toLowerCase().replace(/^@nuxtjs\//, 'nuxt-').replace(/^@/, '')
  return SUPPORTED_NAMES.find((name) => name === normalized)
}

export interface DetectedFiles {
  configFiles: Array<{ path: string; content: string }>
  localeFiles: Array<{ path: string; content: string }>
  sampleSources: Array<{ path: string; content: string }>
  packageJson: string | undefined
}

async function detectFiles(info: LibraryInfo): Promise<DetectedFiles> {
  const result: DetectedFiles = {
    configFiles: [],
    localeFiles: [],
    sampleSources: [],
    packageJson: undefined,
  }

  // Read package.json
  const pkgPath = resolve('package.json')
  if (existsSync(pkgPath)) {
    result.packageJson = readFileSync(pkgPath, 'utf-8')
  }

  // Find config files
  for (const pattern of info.configPatterns) {
    const fullPath = resolve(pattern)
    if (existsSync(fullPath)) {
      result.configFiles.push({
        path: pattern,
        content: readFileSync(fullPath, 'utf-8'),
      })
    }
  }

  // Find locale files (limit to 10 to avoid huge prompts)
  const localeGlobs = await fg(info.localePatterns, { absolute: false })
  for (const file of localeGlobs.slice(0, 10)) {
    const fullPath = resolve(file)
    const content = readFileSync(fullPath, 'utf-8')
    // Truncate large files
    result.localeFiles.push({
      path: file,
      content: content.length > 5000 ? content.slice(0, 5000) + '\n... (truncated)' : content,
    })
  }

  // Find sample source files (limit to 5 for prompt size)
  const sourceGlobs = await fg(info.sourcePatterns, { absolute: false })
  for (const file of sourceGlobs.slice(0, 5)) {
    const fullPath = resolve(file)
    const content = readFileSync(fullPath, 'utf-8')
    result.sampleSources.push({
      path: file,
      content: content.length > 3000 ? content.slice(0, 3000) + '\n... (truncated)' : content,
    })
  }

  return result
}

function loadMigrationGuide(guidePath: string): string {
  // Try to find the migration guide relative to the CLI package
  const candidates = [
    resolve('node_modules', '@fluenti', 'cli', '..', '..', guidePath),
    join(__dirname, '..', '..', '..', guidePath),
    join(__dirname, '..', '..', guidePath),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf-8')
    }
  }

  return ''
}

export function buildMigratePrompt(
  library: LibraryInfo,
  detected: DetectedFiles,
  migrationGuide: string,
): string {
  const sections: string[] = []

  sections.push(
    `You are a migration assistant helping convert a ${library.framework} project from "${library.name}" to Fluenti (@fluenti).`,
    '',
    'Your task:',
    '1. Generate a `fluenti.config.ts` file based on the existing i18n configuration',
    '2. Convert each locale/translation file to Fluenti PO format',
    '3. List the code changes needed (file by file) to migrate source code from the old API to Fluenti API',
    '',
  )

  if (migrationGuide) {
    sections.push(
      '=== MIGRATION GUIDE ===',
      migrationGuide,
      '',
    )
  }

  if (detected.packageJson) {
    sections.push(
      '=== package.json ===',
      detected.packageJson,
      '',
    )
  }

  if (detected.configFiles.length > 0) {
    sections.push('=== EXISTING CONFIG FILES ===')
    for (const file of detected.configFiles) {
      sections.push(`--- ${file.path} ---`, file.content, '')
    }
  }

  if (detected.localeFiles.length > 0) {
    sections.push('=== EXISTING LOCALE FILES ===')
    for (const file of detected.localeFiles) {
      sections.push(`--- ${file.path} ---`, file.content, '')
    }
  }

  if (detected.sampleSources.length > 0) {
    sections.push('=== SAMPLE SOURCE FILES ===')
    for (const file of detected.sampleSources) {
      sections.push(`--- ${file.path} ---`, file.content, '')
    }
  }

  sections.push(
    '',
    '=== OUTPUT FORMAT ===',
    'Respond with the following sections, each starting with the exact header shown:',
    '',
    '### FLUENTI_CONFIG',
    '```ts',
    '// The fluenti.config.ts content',
    '```',
    '',
    '### LOCALE_FILES',
    'For each locale file, output:',
    '#### LOCALE: {locale_code}',
    '```po',
    '// The PO file content',
    '```',
    '',
    '### MIGRATION_STEPS',
    'A numbered checklist of specific code changes needed, with before/after examples.',
    '',
    '### INSTALL_COMMANDS',
    '```bash',
    '// The install and uninstall commands',
    '```',
  )

  return sections.join('\n')
}

async function invokeAI(provider: AIProvider, prompt: string): Promise<string> {
  const maxBuffer = 10 * 1024 * 1024

  try {
    if (provider === 'claude') {
      const { stdout } = await execFileAsync('claude', ['-p', prompt], { maxBuffer })
      return stdout
    } else {
      const { stdout } = await execFileAsync('codex', ['-p', prompt, '--full-auto'], { maxBuffer })
      return stdout
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string }
    if (err.code === 'ENOENT') {
      throw new Error(
        `"${provider}" CLI not found. Please install it first:\n` +
        (provider === 'claude'
          ? '  npm install -g @anthropic-ai/claude-code'
          : '  npm install -g @openai/codex'),
      )
    }
    throw error
  }
}

interface MigrateResult {
  config: string | undefined
  localeFiles: Array<{ locale: string; content: string }>
  steps: string | undefined
  installCommands: string | undefined
}

export function parseResponse(response: string): MigrateResult {
  const result: MigrateResult = {
    config: undefined,
    localeFiles: [],
    steps: undefined,
    installCommands: undefined,
  }

  // Extract fluenti.config.ts
  const configMatch = response.match(/### FLUENTI_CONFIG[\s\S]*?```(?:ts|typescript)?\n([\s\S]*?)```/)
  if (configMatch) {
    result.config = configMatch[1]!.trim()
  }

  // Extract locale files
  const localeSection = response.match(/### LOCALE_FILES([\s\S]*?)(?=### MIGRATION_STEPS|### INSTALL_COMMANDS|$)/)
  if (localeSection) {
    const localeRegex = /#### LOCALE:\s*(\S+)\s*\n```(?:po)?\n([\s\S]*?)```/g
    let match
    while ((match = localeRegex.exec(localeSection[1]!)) !== null) {
      result.localeFiles.push({
        locale: match[1]!,
        content: match[2]!.trim(),
      })
    }
  }

  // Extract migration steps
  const stepsMatch = response.match(/### MIGRATION_STEPS\s*\n([\s\S]*?)(?=### INSTALL_COMMANDS|$)/)
  if (stepsMatch) {
    result.steps = stepsMatch[1]!.trim()
  }

  // Extract install commands
  const installMatch = response.match(/### INSTALL_COMMANDS[\s\S]*?```(?:bash|sh)?\n([\s\S]*?)```/)
  if (installMatch) {
    result.installCommands = installMatch[1]!.trim()
  }

  return result
}

export interface MigrateOptions {
  from: string
  provider: AIProvider
  write: boolean
}

export async function runMigrate(options: MigrateOptions): Promise<void> {
  const { from, provider, write } = options

  const library = resolveLibrary(from)
  if (!library) {
    consola.error(`Unsupported library "${from}". Supported libraries:`)
    for (const name of SUPPORTED_NAMES) {
      consola.log(`  - ${name}`)
    }
    return
  }

  const info = LIBRARY_INFO[library]
  consola.info(`Migrating from ${info.name} (${info.framework}) to Fluenti`)

  // Detect existing files
  consola.info('Scanning project for existing i18n files...')
  const detected = await detectFiles(info)

  if (detected.configFiles.length === 0 && detected.localeFiles.length === 0) {
    consola.warn(`No ${info.name} configuration or locale files found.`)
    consola.info('Make sure you are running this command from the project root directory.')
    return
  }

  consola.info(`Found: ${detected.configFiles.length} config file(s), ${detected.localeFiles.length} locale file(s), ${detected.sampleSources.length} source file(s)`)

  // Load migration guide
  const migrationGuide = loadMigrationGuide(info.migrationGuide)

  // Build prompt and invoke AI
  consola.info(`Generating migration plan with ${provider}...`)
  const prompt = buildMigratePrompt(info, detected, migrationGuide)
  const response = await invokeAI(provider, prompt)
  const result = parseResponse(response)

  // Display install commands
  if (result.installCommands) {
    consola.log('')
    consola.box({
      title: 'Install Commands',
      message: result.installCommands,
    })
  }

  // Write or display fluenti.config.ts
  if (result.config) {
    if (write) {
      const { writeFileSync } = await import('node:fs')
      const configPath = resolve('fluenti.config.ts')
      writeFileSync(configPath, result.config, 'utf-8')
      consola.success(`Written: ${configPath}`)
    } else {
      consola.log('')
      consola.box({
        title: 'fluenti.config.ts',
        message: result.config,
      })
    }
  }

  // Write or display locale files
  if (result.localeFiles.length > 0) {
    if (write) {
      const { writeFileSync, mkdirSync } = await import('node:fs')
      const catalogDir = './locales'
      mkdirSync(resolve(catalogDir), { recursive: true })
      for (const file of result.localeFiles) {
        const outPath = resolve(catalogDir, `${file.locale}.po`)
        writeFileSync(outPath, file.content, 'utf-8')
        consola.success(`Written: ${outPath}`)
      }
    } else {
      for (const file of result.localeFiles) {
        consola.log('')
        consola.box({
          title: `locales/${file.locale}.po`,
          message: file.content.length > 500
            ? file.content.slice(0, 500) + '\n... (use --write to save full file)'
            : file.content,
        })
      }
    }
  }

  // Display migration steps
  if (result.steps) {
    consola.log('')
    consola.box({
      title: 'Migration Steps',
      message: result.steps,
    })
  }

  if (!write && (result.config || result.localeFiles.length > 0)) {
    consola.log('')
    consola.info('Run with --write to save generated files to disk:')
    consola.log(`  fluenti migrate --from ${from} --write`)
  }
}
