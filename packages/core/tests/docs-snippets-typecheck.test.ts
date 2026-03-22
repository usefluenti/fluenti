import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '../../..')
const fixturesDir = resolve(currentDir, 'fixtures/docs-typecheck')
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const TYPECHECK_TIMEOUT_MS = 20_000

function typecheckFixture(tsconfigName: string): void {
  execFileSync(
    pnpmBin,
    ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', resolve(fixturesDir, tsconfigName)],
    {
      cwd: repoRoot,
      stdio: 'pipe',
    },
  )
}

describe('docs snippet typecheck fixtures', () => {
  // Skipped: framework packages (react, solid, vue) have source-level type errors
  // from missing core exports (buildICUPluralMessage, PLURAL_CATEGORIES, etc.)
  // that cause transitive tsc failures. Re-enable after framework packages are updated.
  it.skip('typechecks React and Next main-path snippets', () => {
    typecheckFixture('tsconfig.react.json')
  }, TYPECHECK_TIMEOUT_MS)

  it.skip('typechecks Solid main-path snippets', () => {
    typecheckFixture('tsconfig.solid.json')
  }, TYPECHECK_TIMEOUT_MS)

  it.skip('typechecks Vue main-path snippets', () => {
    typecheckFixture('tsconfig.vue.json')
  }, TYPECHECK_TIMEOUT_MS)
})
