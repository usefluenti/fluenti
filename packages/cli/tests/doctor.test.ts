import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { runDoctor } from '../src/doctor'

function createProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'fluenti-doctor-'))
  for (const [relPath, content] of Object.entries(files)) {
    const abs = join(dir, relPath)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }
  return dir
}

describe('runDoctor', () => {
  const tmpDirs: string[] = []

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports interpolate/runtime issues and missing vite plugin', async () => {
    const dir = createProject({
      'package.json': JSON.stringify({
        name: 'react-app',
        dependencies: { react: '^19.0.0' },
      }),
      'fluenti.config.ts': `export default {
  sourceLocale: 'en',
  locales: ['en', 'ja'],
  catalogDir: './locales',
  format: 'json',
  include: ['./src/**/*.{ts,tsx}'],
  compileOutDir: './src/locales/compiled',
}
`,
      'vite.config.ts': `import { defineConfig } from 'vite'
export default defineConfig({})
`,
      'src/App.tsx': `import { Trans } from '@fluenti/react'
export function App() { return <Trans>Hello</Trans> }
`,
      'src/main.tsx': `import { interpolate } from '@fluenti/react'
console.log(interpolate)
`,
    })
    tmpDirs.push(dir)

    const report = await runDoctor({ cwd: dir })
    const codes = report.findings.map((finding) => finding.code)

    expect(codes).toContain('main-entry-interpolate')
    expect(codes).toContain('missing-vite-plugin')
    expect(codes).toContain('missing-source-catalog')
    expect(codes).toContain('missing-compiled-catalogs')
  })

  it('reports missing withFluenti in Next projects', async () => {
    const dir = createProject({
      'package.json': JSON.stringify({
        name: 'next-app',
        dependencies: { next: '^15.0.0', react: '^19.0.0' },
      }),
      'next.config.ts': `export default { reactStrictMode: true }\n`,
      'src/app/page.tsx': `import { t } from '@fluenti/react'
export default function Page() { return <h1>{t\`Hello\`}</h1> }
`,
    })
    tmpDirs.push(dir)

    const report = await runDoctor({ cwd: dir })

    expect(report.findings.some((finding) => finding.code === 'missing-with-fluenti' && finding.severity === 'error')).toBe(true)
  })
})
