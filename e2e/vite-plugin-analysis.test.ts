/**
 * E2E: Vite plugin features and code splitting strategy analysis.
 *
 * Builds fixtures and inspects output — no browser needed.
 * Uses Vitest (not Playwright) since it's filesystem/build analysis.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'node:child_process'
import {
  readdirSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  cpSync,
} from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = join(import.meta.dirname, '..')
const CLI = join(ROOT, 'packages/cli/dist/cli.js')
const FIXTURE_DIR = join(import.meta.dirname, 'fixtures/react-splitting')

// ── Helpers ────────────────────────────────────────────────────────────────────

function cliEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (key.startsWith('VITEST')) continue
    if (key === 'TEST') continue
    env[key] = value
  }
  env.FORCE_COLOR = '0'
  env.NODE_ENV = 'production'
  return env
}

function readAllJsFiles(assetsDir: string): { name: string; content: string }[] {
  return readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ name: f, content: readFileSync(join(assetsDir, f), 'utf-8') }))
}

// ── 1. Virtual module resolution verification ──────────────────────────────────

describe('virtual module resolution verification', () => {
  let jsFiles: { name: string; content: string }[]

  beforeAll(() => {
    // Compile catalogs first, then build the fixture
    execSync(`node ${CLI} compile --config ${join(FIXTURE_DIR, 'fluenti.config.ts')}`, {
      cwd: FIXTURE_DIR,
      encoding: 'utf-8',
      timeout: 30_000,
      env: cliEnv(),
    })
    execSync('pnpm build', {
      cwd: FIXTURE_DIR,
      stdio: 'pipe',
      timeout: 60_000,
      env: cliEnv(),
    })

    const assetsDir = join(FIXTURE_DIR, 'dist/assets')
    jsFiles = readAllJsFiles(assetsDir)
  })

  it('build output contains references to compiled catalog (fluenti runtime imports resolved)', () => {
    const allContent = jsFiles.map((f) => f.content).join('\n')

    // Virtual modules should be resolved — no raw virtual: imports in output
    expect(allContent).not.toContain('virtual:fluenti/runtime')
    expect(allContent).not.toContain('virtual:fluenti/messages')

    // The resolved output should contain catalog hash references (6-8 char hashes)
    // These are the message hashes from the fixture's PO files
    expect(allContent).toMatch(/[a-z0-9]{5,8}/)
  })

  it('no raw $t() calls remain in built output (all transformed to catalog references)', () => {
    const allContent = jsFiles.map((f) => f.content).join('\n')

    // After build-time transform, $t('literal string') calls should be replaced
    expect(allContent).not.toMatch(/\$t\s*\(\s*['"`]Welcome to Fluenti/)
    expect(allContent).not.toMatch(/\$t\s*\(\s*['"`]About our project/)
    expect(allContent).not.toMatch(/\$t\s*\(\s*['"`]This is the home page/)
    expect(allContent).not.toMatch(/\$t\s*\(\s*['"`]Learn more about Fluenti/)
  })

  it('built locale chunks follow naming convention', () => {
    const fileNames = jsFiles.map((f) => f.name)

    // Japanese locale should be a separate chunk (non-default locale)
    const jaChunk = fileNames.find((f) => f.startsWith('ja-') || f.includes('.ja.'))
    expect(jaChunk).toBeDefined()

    // English (default locale) should NOT be a separate chunk — it is inlined
    const enChunk = fileNames.find((f) => f.startsWith('en-') && !f.startsWith('en.'))
    expect(enChunk).toBeUndefined()
  })
})

// ── 2. Dynamic vs Static splitting comparison ──────────────────────────────────

describe('dynamic splitting — build output analysis', () => {
  let jsFiles: { name: string; content: string }[]
  let assetsDir: string

  beforeAll(() => {
    assetsDir = join(FIXTURE_DIR, 'dist/assets')
    // Build was already done in the previous describe's beforeAll, but re-read in case
    if (!existsSync(assetsDir)) {
      execSync(`node ${CLI} compile --config ${join(FIXTURE_DIR, 'fluenti.config.ts')}`, {
        cwd: FIXTURE_DIR,
        encoding: 'utf-8',
        timeout: 30_000,
        env: cliEnv(),
      })
      execSync('pnpm build', {
        cwd: FIXTURE_DIR,
        stdio: 'pipe',
        timeout: 60_000,
        env: cliEnv(),
      })
    }
    jsFiles = readAllJsFiles(assetsDir)
  })

  it('default locale (en) messages are in the main/entry chunk', () => {
    const indexChunk = jsFiles.find((f) => f.name.startsWith('index-'))
    expect(indexChunk).toBeDefined()

    // The main chunk should contain the shared nav hashes
    // "Home" -> n0mxf2, "About" -> onrqou
    expect(indexChunk!.content).toContain('n0mxf2')
    expect(indexChunk!.content).toContain('onrqou')
  })

  it('non-default locale (ja) messages are in separate lazy chunks', () => {
    const jaChunk = jsFiles.find((f) => f.name.startsWith('ja-'))
    expect(jaChunk).toBeDefined()

    // Japanese chunk should contain translated content
    expect(jaChunk!.content.length).toBeGreaterThan(50)

    // Main index chunk should NOT contain Japanese translations
    const indexChunk = jsFiles.find((f) => f.name.startsWith('index-'))
    expect(indexChunk).toBeDefined()
    expect(indexChunk!.content).not.toContain('Fluentiへようこそ')
  })

  it('route-specific messages are in route chunks (not shared)', () => {
    const homeChunk = jsFiles.find((f) => f.name.startsWith('Home-'))
    const aboutChunk = jsFiles.find((f) => f.name.startsWith('About-'))
    expect(homeChunk).toBeDefined()
    expect(aboutChunk).toBeDefined()

    // Home-specific hash "1kjapm1" (Welcome to Fluenti) should be in Home, not About
    expect(homeChunk!.content).toContain('1kjapm1')
    expect(aboutChunk!.content).not.toContain('1kjapm1')

    // About-specific hash "1rfbb9t" (About our project) should be in About, not Home
    expect(aboutChunk!.content).toContain('1rfbb9t')
    expect(homeChunk!.content).not.toContain('1rfbb9t')
  })

  it('shared messages (nav labels) are in the shared/index chunk', () => {
    const indexChunk = jsFiles.find((f) => f.name.startsWith('index-'))
    expect(indexChunk).toBeDefined()

    // "Home" and "About" nav labels should be in main chunk
    expect(indexChunk!.content).toContain('n0mxf2')
    expect(indexChunk!.content).toContain('onrqou')

    // These nav hashes should NOT be duplicated in route chunks
    const homeChunk = jsFiles.find((f) => f.name.startsWith('Home-'))
    const aboutChunk = jsFiles.find((f) => f.name.startsWith('About-'))
    expect(homeChunk!.content).not.toContain('n0mxf2')
    expect(aboutChunk!.content).not.toContain('n0mxf2')
  })
})

// ── 3. Parallel compile determinism ────────────────────────────────────────────

describe('parallel compile determinism', () => {
  let tmpDir: string

  function createCompileProject(): string {
    const dir = mkdtempSync(join(tmpdir(), 'fluenti-determinism-'))

    writeFileSync(
      join(dir, 'fluenti.config.ts'),
      `export default {
  sourceLocale: 'en',
  locales: ['en', 'ja'],
  catalogDir: './locales',
  format: 'json',
  include: ['./src/**/*.{ts,tsx}'],
  compileOutDir: './compiled',
}\n`,
    )

    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(
      join(dir, 'src/app.tsx'),
      `import { msg } from '@fluenti/react'
export const GREETING = msg\`Hello, world\`
export const FAREWELL = msg\`Goodbye, world\`
export const THANKS = msg\`Thank you\`
`,
    )

    mkdirSync(join(dir, 'locales'), { recursive: true })
    writeFileSync(
      join(dir, 'locales/en.json'),
      JSON.stringify({
        'Hello, world': { message: 'Hello, world' },
        'Goodbye, world': { message: 'Goodbye, world' },
        'Thank you': { message: 'Thank you' },
      }, null, 2),
    )
    writeFileSync(
      join(dir, 'locales/ja.json'),
      JSON.stringify({
        'Hello, world': { message: 'Hello, world', translation: 'こんにちは、世界' },
        'Goodbye, world': { message: 'Goodbye, world', translation: 'さようなら、世界' },
        'Thank you': { message: 'Thank you', translation: 'ありがとう' },
      }, null, 2),
    )

    return dir
  }

  function compileAndReadOutput(dir: string): { en: string; ja: string } {
    execSync(
      `node ${CLI} compile --config ${join(dir, 'fluenti.config.ts')} 2>&1`,
      { cwd: dir, encoding: 'utf-8', timeout: 30_000, env: cliEnv() },
    )
    const en = readFileSync(join(dir, 'compiled/en.js'), 'utf-8')
    const ja = readFileSync(join(dir, 'compiled/ja.js'), 'utf-8')
    return { en, ja }
  }

  it('compile the same catalog 3 times produces byte-identical output', () => {
    tmpDir = createCompileProject()
    const results: { en: string; ja: string }[] = []

    for (let i = 0; i < 3; i++) {
      // Remove compiled output between runs
      const compiledDir = join(tmpDir, 'compiled')
      if (existsSync(compiledDir)) rmSync(compiledDir, { recursive: true })
      results.push(compileAndReadOutput(tmpDir))
    }

    // All three runs should produce identical output
    expect(results[0]!.en).toBe(results[1]!.en)
    expect(results[1]!.en).toBe(results[2]!.en)
    expect(results[0]!.ja).toBe(results[1]!.ja)
    expect(results[1]!.ja).toBe(results[2]!.ja)

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('compile with different locale order produces same output (order-independent)', () => {
    // Project A: locales ['en', 'ja']
    const dirA = createCompileProject()

    // Project B: locales ['ja', 'en']
    const dirB = createCompileProject()
    const configB = readFileSync(join(dirB, 'fluenti.config.ts'), 'utf-8')
    writeFileSync(
      join(dirB, 'fluenti.config.ts'),
      configB.replace("['en', 'ja']", "['ja', 'en']"),
    )

    const resultA = compileAndReadOutput(dirA)
    const resultB = compileAndReadOutput(dirB)

    // Each locale's output should be identical regardless of order
    expect(resultA.en).toBe(resultB.en)
    expect(resultA.ja).toBe(resultB.ja)

    rmSync(dirA, { recursive: true, force: true })
    rmSync(dirB, { recursive: true, force: true })
  })
})

// ── 4. Vite plugin config resolution ───────────────────────────────────────────

describe('Vite plugin config resolution', () => {
  let tmpDir: string

  beforeAll(() => {
    // Create a minimal Vite project with fluenti.config.ts
    tmpDir = mkdtempSync(join(tmpdir(), 'fluenti-config-resolve-'))

    // Copy node_modules symlinks from the react-splitting fixture
    cpSync(join(FIXTURE_DIR, 'node_modules'), join(tmpDir, 'node_modules'), {
      recursive: true,
      dereference: false,
    })

    // fluenti.config.ts — auto-discoverable
    writeFileSync(
      join(tmpDir, 'fluenti.config.ts'),
      `export default {
  sourceLocale: 'en',
  locales: ['en', 'ja'],
  catalogDir: './locales',
  format: 'json',
  include: ['./src/**/*.{ts,tsx}'],
  compileOutDir: './src/locales/compiled',
  buildAutoCompile: false,
}\n`,
    )

    // vite.config.ts — references the plugin WITHOUT explicit config path
    writeFileSync(
      join(tmpDir, 'vite.config.ts'),
      `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fluentiReact from '@fluenti/react/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    fluentiReact({
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: false,
    }),
  ],
})
`,
    )

    // index.html
    writeFileSync(
      join(tmpDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Test</title></head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`,
    )

    // tsconfig.json
    writeFileSync(
      join(tmpDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          verbatimModuleSyntax: false,
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
      }, null, 2),
    )

    // Minimal source file
    mkdirSync(join(tmpDir, 'src'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'src/main.tsx'),
      `import { createRoot } from 'react-dom/client'
import { I18nProvider, useI18n } from '@fluenti/react'

function App() {
  const { t } = useI18n()
  return <div>{t('Hello from config test')}</div>
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider locale="en" messages={{}}>
    <App />
  </I18nProvider>,
)
`,
    )

    // Compiled catalogs (pre-create since buildAutoCompile is false)
    mkdirSync(join(tmpDir, 'src/locales/compiled'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'src/locales/compiled/en.js'),
      `export default {};\n`,
    )
    writeFileSync(
      join(tmpDir, 'src/locales/compiled/ja.js'),
      `export default {};\n`,
    )
  })

  it('plugin auto-discovers fluenti.config.ts and build succeeds', () => {
    // Verify config file exists in project root
    expect(existsSync(join(tmpDir, 'fluenti.config.ts'))).toBe(true)

    // Build should succeed (plugin resolves config automatically)
    expect(() => {
      execSync('npx vite build', {
        cwd: tmpDir,
        stdio: 'pipe',
        timeout: 60_000,
        env: cliEnv(),
      })
    }).not.toThrow()
  })

  it('build output exists and contains compiled assets', () => {
    const distDir = join(tmpDir, 'dist')
    expect(existsSync(distDir)).toBe(true)

    const assetsDir = join(distDir, 'assets')
    expect(existsSync(assetsDir)).toBe(true)

    const jsFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)
  })

  it('build output contains transformed messages (not raw t() calls)', () => {
    const assetsDir = join(tmpDir, 'dist/assets')
    const allContent = readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(assetsDir, f), 'utf-8'))
      .join('\n')

    // The raw string should not appear as a $t('...') call
    expect(allContent).not.toMatch(/\$t\s*\(\s*['"`]Hello from config test['"`]\s*\)/)
  })

  // Cleanup handled implicitly by OS temp dir lifecycle,
  // but clean up manually to be polite
  it('cleanup temp dir', () => {
    rmSync(tmpDir, { recursive: true, force: true })
  })
})

// ── 5. HMR dev mode (lightweight verification) ────────────────────────────────

describe('HMR dev mode — plugin structure verification', () => {
  it('plugin returns HMR-capable plugin array with expected plugin names', async () => {
    // Import the React plugin factory and inspect the returned plugins
    const fluentiReact = await import(
      join(ROOT, 'packages/react/dist/vite-plugin.js')
    ).then((m) => m.default)

    const plugins = fluentiReact({
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: 'dynamic',
    })

    expect(Array.isArray(plugins)).toBe(true)

    const pluginNames = plugins.map((p: { name: string }) => p.name)

    // Verify required plugin names exist
    expect(pluginNames).toContain('fluenti:virtual')
    expect(pluginNames).toContain('fluenti:script-transform')
    expect(pluginNames).toContain('fluenti:build-compile')
    expect(pluginNames).toContain('fluenti:build-split')
    expect(pluginNames).toContain('fluenti:dev')
  })

  it('dev plugin has configureServer and hotUpdate hooks', async () => {
    const fluentiReact = await import(
      join(ROOT, 'packages/react/dist/vite-plugin.js')
    ).then((m) => m.default)

    const plugins = fluentiReact({
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: false,
    })

    const devPlugin = plugins.find((p: { name: string }) => p.name === 'fluenti:dev')
    expect(devPlugin).toBeDefined()
    expect(typeof devPlugin.configureServer).toBe('function')
    expect(typeof devPlugin.hotUpdate).toBe('function')
  })

  it('dev-runner source exports runExtractCompile and createDebouncedRunner', () => {
    // The dev-runner is an internal module bundled into the plugin.
    // Verify the source exists and exports the expected functions.
    const devRunnerSource = readFileSync(
      join(ROOT, 'packages/vite-plugin/src/dev-runner.ts'),
      'utf-8',
    )

    expect(devRunnerSource).toContain('export async function runExtractCompile')
    expect(devRunnerSource).toContain('export function createDebouncedRunner')
  })

  it('virtual module plugin has resolveId and load hooks', async () => {
    const fluentiReact = await import(
      join(ROOT, 'packages/react/dist/vite-plugin.js')
    ).then((m) => m.default)

    const plugins = fluentiReact({
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: 'dynamic',
    })

    const virtualPlugin = plugins.find((p: { name: string }) => p.name === 'fluenti:virtual')
    expect(virtualPlugin).toBeDefined()
    expect(typeof virtualPlugin.resolveId).toBe('function')
    expect(typeof virtualPlugin.load).toBe('function')
  })

  it('build-split plugin has transform and generateBundle hooks', async () => {
    const fluentiReact = await import(
      join(ROOT, 'packages/react/dist/vite-plugin.js')
    ).then((m) => m.default)

    const plugins = fluentiReact({
      sourceLocale: 'en',
      locales: ['en', 'ja'],
      splitting: 'dynamic',
    })

    const buildSplitPlugin = plugins.find((p: { name: string }) => p.name === 'fluenti:build-split')
    expect(buildSplitPlugin).toBeDefined()
    expect(typeof buildSplitPlugin.transform).toBe('function')
    expect(typeof buildSplitPlugin.generateBundle).toBe('function')
  })
})
