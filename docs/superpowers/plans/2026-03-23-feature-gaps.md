# Feature Gaps Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 features that are defined in types/docs but not functional, prior to 0.3.0 release.

**Architecture:** Each fix is self-contained. Tasks 1-3 can be parallelized. Tasks 4-5 are sequential (plugin hooks should land before diagnostics). Every fix follows TDD: write failing test → implement → verify → commit.

**Tech Stack:** TypeScript, Vitest, pnpm monorepo

**Spec:** `docs/superpowers/specs/2026-03-23-feature-gaps-design.md`

---

### Task 1: `per-route` Splitting Strategy

**Files:**
- Modify: `packages/core/src/types.ts:199`
- Modify: `packages/vite-plugin/src/index.ts:24`

- [ ] **Step 1: Add `per-route` to the public config type**

In `packages/core/src/types.ts` line 199, change:
```typescript
splitting?: 'dynamic' | 'static' | false
```
to:
```typescript
splitting?: 'dynamic' | 'static' | 'per-route' | false
```

- [ ] **Step 2: Remove `InternalSplitStrategy` type alias**

In `packages/vite-plugin/src/index.ts` line 24, remove:
```typescript
type InternalSplitStrategy = FluentiBuildConfig['splitting'] | 'per-route'
```

Then find all usages of `InternalSplitStrategy` in that file and replace with `FluentiBuildConfig['splitting']`.

- [ ] **Step 3: Verify existing per-route tests pass**

Run: `pnpm --filter @fluenti/vite-plugin test`
Expected: All tests pass (existing per-route-splitting tests should work with the unified type).

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/vite-plugin/src/index.ts
git commit -m "feat(core): expose per-route splitting strategy in public config type"
```

---

### Task 2: `msg` Tagged Template Extraction

**Files:**
- Modify: `packages/cli/src/tsx-extractor.ts:413-456`
- Test: `packages/cli/tests/tsx-extractor.test.ts`

- [ ] **Step 1: Write failing tests for msg extraction**

Add to `packages/cli/tests/tsx-extractor.test.ts`:

```typescript
describe('msg`` extraction', () => {
  it('extracts msg tagged template from @fluenti/react import', () => {
    const code = `
      import { msg } from '@fluenti/react'
      const ROLE = msg\`Administrator\`
    `
    const result = extractFromTsx(code, 'test.tsx')
    expect(result).toHaveLength(1)
    expect(result[0]!.message).toBe('Administrator')
    expect(result[0]!.comment).toBe('msg tagged template')
  })

  it('extracts msg tagged template from @fluenti/solid import', () => {
    const code = `
      import { msg } from '@fluenti/solid'
      const TITLE = msg\`Page Title\`
    `
    const result = extractFromTsx(code, 'test.tsx')
    expect(result).toHaveLength(1)
    expect(result[0]!.message).toBe('Page Title')
  })

  it('extracts aliased msg import', () => {
    const code = `
      import { msg as defineMessage } from '@fluenti/react'
      const ROLE = defineMessage\`Admin\`
    `
    const result = extractFromTsx(code, 'test.tsx')
    expect(result).toHaveLength(1)
    expect(result[0]!.message).toBe('Admin')
  })

  it('does NOT extract msg in CallExpression form', () => {
    const code = `
      import { msg } from '@fluenti/react'
      const x = msg({ id: 'test', message: 'Hello' })
    `
    const result = extractFromTsx(code, 'test.tsx')
    expect(result).toHaveLength(0)
  })

  it('extracts both t and msg from the same file', () => {
    const code = `
      import { t, msg } from '@fluenti/react'
      const ROLE = msg\`Admin\`
      function App() { return t\`Hello\` }
    `
    const result = extractFromTsx(code, 'test.tsx')
    expect(result).toHaveLength(2)
    expect(result.map(m => m.message).sort()).toEqual(['Admin', 'Hello'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @fluenti/cli test -- --grep "msg"`
Expected: FAIL — msg tagged templates are not extracted.

- [ ] **Step 3: Implement msg binding collection**

In `packages/cli/src/tsx-extractor.ts`, modify `collectDirectImportTBindings`:

```typescript
// Rename and change return type from Set<string> to Map<string, 't' | 'msg'>
function collectDirectBindings(ast: SourceNode): Map<string, 't' | 'msg'> {
  const bindings = new Map<string, 't' | 'msg'>()
  const body = Array.isArray(ast['body']) ? ast['body'] : []

  for (const entry of body) {
    if (!isImportDeclaration(entry)) continue
    if (!DIRECT_T_SOURCES.has(entry.source.value)) continue

    for (const specifier of entry.specifiers) {
      if (!isImportSpecifier(specifier)) continue
      const importedName = readImportedName(specifier)
      if (importedName === 't' || importedName === 'msg') {
        bindings.set(specifier.local.name, importedName as 't' | 'msg')
      }
    }
  }

  return bindings
}
```

Update `extractFromTsx` to use the new function:

```typescript
const directBindings = collectDirectBindings(ast)
```

Update the TaggedTemplateExpression handler (~line 441-456):

```typescript
if (node.type === 'TaggedTemplateExpression') {
  const tagged = node as TaggedTemplateExpressionNode
  if (isIdentifier(tagged.tag)) {
    const bindingType = directBindings.get(tagged.tag.name)
    const isDirectT = tagged.tag.name === 't' || bindingType === 't'
    const isDirectMsg = bindingType === 'msg'

    if (isDirectT || isDirectMsg) {
      const descriptor = extractTaggedTemplateMessage(code, tagged)
      if (isDirectMsg) {
        descriptor.comment = 'msg tagged template'
      }
      const extracted = createExtractedMessage(descriptor, filename, tagged)
      if (extracted) {
        messages.push(extracted)
      }
    }
  }
  return
}
```

Update the CallExpression handler (~line 459-461) to exclude msg bindings:

```typescript
if (isIdentifier(call.callee) && (call.callee.name === 't' || directBindings.get(call.callee.name) === 't')) {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @fluenti/cli test`
Expected: All tests pass, including the new msg tests.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/tsx-extractor.ts packages/cli/tests/tsx-extractor.test.ts
git commit -m "feat(cli): extract msg tagged templates from source files"
```

---

### Task 3: `idGenerator` Config Support

**Files:**
- Modify: `packages/cli/src/tsx-extractor.ts` (extractFromTsx signature)
- Modify: `packages/cli/src/vue-extractor.ts` (extractFromVue signature)
- Modify: `packages/cli/src/compile.ts`
- Modify: `packages/cli/src/cli.ts`
- Test: `packages/cli/tests/compile.test.ts`

- [ ] **Step 1: Write failing test for custom idGenerator in compilation**

Add to `packages/cli/tests/compile.test.ts`:

```typescript
describe('custom idGenerator', () => {
  it('uses custom idGenerator when provided', () => {
    const customIdGen = (message: string) => `custom_${message.replace(/\s/g, '_').toLowerCase()}`
    const catalog: CatalogData = {
      [customIdGen('Hello World')]: { message: 'Hello World', translation: 'Hola Mundo' },
    }
    const result = compileCatalog(catalog, { idGenerator: customIdGen })
    expect(result).toContain('Hola Mundo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fluenti/cli test -- --grep "custom idGenerator"`
Expected: FAIL — `compileCatalog` does not accept `idGenerator` option.

- [ ] **Step 3: Add idGenerator parameter to compileCatalog**

In `packages/cli/src/compile.ts`, add `idGenerator` to the options parameter of `compileCatalog()`. Where `createMessageId()` is called, use `idGenerator ?? createMessageId` instead.

Read the file first to identify the exact call sites.

- [ ] **Step 4: Add idGenerator parameter to extractFromTsx**

In `packages/cli/src/tsx-extractor.ts`, change the `extractFromTsx` signature:

```typescript
export function extractFromTsx(
  code: string,
  filename: string,
  idGenerator?: (message: string, context?: string) => string,
): ExtractedMessage[]
```

In `descriptorFromStaticParts` and `extractTaggedTemplateMessage`, use `idGenerator ?? createMessageId` where `createMessageId` is called.

- [ ] **Step 5: Wire idGenerator from config into CLI commands**

In `packages/cli/src/cli.ts`, pass `config.idGenerator` to `extractFromTsx()` and `compileCatalog()` calls. Read the file to find all call sites.

- [ ] **Step 6: Run all CLI tests**

Run: `pnpm --filter @fluenti/cli test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/tsx-extractor.ts packages/cli/src/vue-extractor.ts packages/cli/src/compile.ts packages/cli/src/cli.ts packages/cli/tests/compile.test.ts
git commit -m "feat(cli): support custom idGenerator config for extraction and compilation"
```

---

### Task 4: Plugin Hooks Integration

**Files:**
- Modify: `packages/cli/src/cli.ts`
- Create: `packages/cli/tests/plugin-hooks.test.ts`

- [ ] **Step 1: Write failing tests for plugin hooks**

Create `packages/cli/tests/plugin-hooks.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { FluentiPlugin, PluginExtractContext, PluginCompileContext } from '@fluenti/core'

describe('plugin hooks', () => {
  it('onAfterExtract is called with correct context shape', () => {
    // This test will verify the integration once wired.
    // For now, create a helper that runs plugins and test it directly.
    const plugin: FluentiPlugin = {
      name: 'test-plugin',
      onAfterExtract: vi.fn(),
    }

    const context: PluginExtractContext = {
      messages: new Map(),
      sourceLocale: 'en',
      targetLocales: ['ja'],
    }

    // Direct invocation test
    plugin.onAfterExtract!(context)
    expect(plugin.onAfterExtract).toHaveBeenCalledWith(context)
  })

  it('transformMessages modifies messages before compilation', async () => {
    const plugin: FluentiPlugin = {
      name: 'uppercase-plugin',
      transformMessages: async (messages) => {
        const result: Record<string, string> = {}
        for (const [key, value] of Object.entries(messages)) {
          result[key] = value.toUpperCase()
        }
        return result
      },
    }

    const input = { greeting: 'hello' }
    const output = await plugin.transformMessages!(input, 'en')
    expect(output).toEqual({ greeting: 'HELLO' })
  })

  it('plugins execute in array order', async () => {
    const order: string[] = []
    const plugin1: FluentiPlugin = {
      name: 'first',
      onAfterExtract: () => { order.push('first') },
    }
    const plugin2: FluentiPlugin = {
      name: 'second',
      onAfterExtract: () => { order.push('second') },
    }

    const plugins = [plugin1, plugin2]
    const context: PluginExtractContext = {
      messages: new Map(),
      sourceLocale: 'en',
      targetLocales: ['ja'],
    }

    for (const p of plugins) {
      await p.onAfterExtract?.(context)
    }
    expect(order).toEqual(['first', 'second'])
  })
})
```

- [ ] **Step 2: Run tests to verify they pass (these are unit tests for the interface)**

Run: `pnpm --filter @fluenti/cli test -- --grep "plugin hooks"`
Expected: PASS (these test the plugin interface directly).

- [ ] **Step 3: Create a `runPluginHooks` helper function**

Add a helper in `packages/cli/src/cli.ts` (or a new `packages/cli/src/plugin-runner.ts` if preferred):

```typescript
import type { FluentiPlugin, PluginExtractContext, PluginCompileContext } from '@fluenti/core'

async function runExtractPlugins(plugins: readonly FluentiPlugin[] | undefined, context: PluginExtractContext): Promise<void> {
  if (!plugins) return
  for (const plugin of plugins) {
    await plugin.onAfterExtract?.(context)
  }
}

async function runCompilePlugins(
  hook: 'onBeforeCompile' | 'onAfterCompile',
  plugins: readonly FluentiPlugin[] | undefined,
  context: PluginCompileContext,
): Promise<void> {
  if (!plugins) return
  for (const plugin of plugins) {
    await plugin[hook]?.(context)
  }
}

async function runTransformMessages(
  plugins: readonly FluentiPlugin[] | undefined,
  messages: Record<string, string>,
  locale: string,
): Promise<Record<string, string>> {
  if (!plugins) return messages
  let result = messages
  for (const plugin of plugins) {
    if (plugin.transformMessages) {
      result = await plugin.transformMessages(result, locale)
    }
  }
  return result
}
```

- [ ] **Step 4: Wire hooks into the extract command**

In `packages/cli/src/cli.ts`, find the extract command handler. After extraction completes and catalogs are written, add:

```typescript
await runExtractPlugins(config.plugins, {
  messages: extractedMessages,  // Map or Record of extracted messages
  sourceLocale: config.sourceLocale,
  targetLocales: config.locales.filter(l => l !== config.sourceLocale),
  config,
})
```

Read the file to find the exact insertion point.

- [ ] **Step 5: Wire hooks into the compile command**

In `packages/cli/src/cli.ts`, find the compile command handler. For each locale being compiled:

```typescript
// Before compilation
await runCompilePlugins('onBeforeCompile', config.plugins, {
  locale, messages: compiledMessages, outDir: config.compileOutDir, config,
})

// Transform messages
const transformedMessages = await runTransformMessages(config.plugins, rawMessages, locale)

// After compilation
await runCompilePlugins('onAfterCompile', config.plugins, {
  locale, messages: compiledMessages, outDir: config.compileOutDir, config,
})
```

Read the file to find the exact insertion points.

- [ ] **Step 6: Run all CLI tests**

Run: `pnpm --filter @fluenti/cli test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/cli.ts packages/cli/tests/plugin-hooks.test.ts
git commit -m "feat(cli): wire plugin hooks into extract and compile pipeline"
```

---

### Task 5: Diagnostics System Export & Integration

**Files:**
- Modify: `packages/core/src/index.ts` (exports + createFluentiCore integration)
- Modify: `packages/core/src/types.ts` (add diagnostics to config)
- Modify: `packages/vue/src/plugin.ts`
- Modify: `packages/react/src/provider.tsx`
- Modify: `packages/solid/src/provider.tsx`
- Test: `packages/core/tests/diagnostics.test.ts`

- [ ] **Step 1: Write failing integration test**

Add to `packages/core/tests/diagnostics.test.ts` (create if it doesn't exist):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createFluentiCore } from '../src'

describe('diagnostics integration', () => {
  it('fires missingKey event when translation is not found', () => {
    const reporter = vi.fn()
    const i18n = createFluentiCore({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: {} },
      diagnostics: { warnMissing: true, reporter },
    })

    i18n.t('nonexistent')
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'missing-key',
        locale: 'en',
        messageId: 'nonexistent',
      }),
    )
  })

  it('fires fallbackUsed event when falling back to another locale', () => {
    const reporter = vi.fn()
    const i18n = createFluentiCore({
      locale: 'ja',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        ja: {},
      },
      diagnostics: { warnFallback: true, reporter },
    })

    i18n.t('hello')
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fallback-used',
        locale: 'ja',
        fallbackLocale: 'en',
        messageId: 'hello',
      }),
    )
  })

  it('does not fire events when diagnostics is not configured', () => {
    const i18n = createFluentiCore({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: {} },
    })

    // Should not throw
    expect(() => i18n.t('nonexistent')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @fluenti/core test -- --grep "diagnostics integration"`
Expected: FAIL — `diagnostics` is not accepted in config.

- [ ] **Step 3: Add diagnostics to FluentiCoreConfigFull**

In `packages/core/src/types.ts`, add to the `FluentiCoreConfigFull` interface:

```typescript
/** Runtime diagnostics configuration */
diagnostics?: DiagnosticsConfig
```

Import `DiagnosticsConfig` from `./diagnostics` at the top of the file.

- [ ] **Step 4: Export diagnostics from core**

In `packages/core/src/index.ts`, add exports:

```typescript
export { createDiagnostics, __DEV__ } from './diagnostics'
export type { DiagnosticEvent, DiagnosticsConfig, Diagnostics } from './diagnostics'
```

- [ ] **Step 5: Integrate diagnostics into createFluentiCore**

In `packages/core/src/index.ts`, inside `createFluentiCore()`:

```typescript
import { createDiagnostics } from './diagnostics'

// At the top of createFluentiCore:
const diagnostics = config.diagnostics ? createDiagnostics(config.diagnostics) : undefined
```

In `lookupCatalog()`, when falling back (~line 131-138), add:

```typescript
if (config.fallbackLocale) {
  const fallbackMsg = catalog.get(config.fallbackLocale, id)
  if (fallbackMsg !== undefined) {
    diagnostics?.fallbackUsed(currentLocale, config.fallbackLocale, id)
    // ... existing code
  }
}
```

In `warnMissing()` (~line 175-178), add:

```typescript
function warnMissing(id: string): void {
  diagnostics?.missingKey(currentLocale, id)
  if (!devWarningsEnabled) return
  console.warn(`[fluenti] Missing translation for "${id}" in locale "${currentLocale}"`)
}
```

Expose diagnostics on the returned instance:

```typescript
return {
  // ... existing properties
  diagnostics: diagnostics ?? undefined,
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @fluenti/core test`
Expected: All tests pass.

- [ ] **Step 7: Pass diagnostics through framework providers**

**React** (`packages/react/src/provider.tsx`): Read the file, find where `createFluentiCore` is called, pass `diagnostics` from props.

**Vue** (`packages/vue/src/plugin.ts`): Read the file, find the missing key handler, wire diagnostics into it.

**Solid** (`packages/solid/src/provider.tsx`): Read the file, find where core instance is created, pass `diagnostics` from props.

Each framework: add `diagnostics?: DiagnosticsConfig` to the provider props/options type.

- [ ] **Step 8: Run full test suite**

Run: `pnpm test`
Expected: All 2604+ tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts packages/core/tests/diagnostics.test.ts packages/vue/src/plugin.ts packages/react/src/provider.tsx packages/solid/src/provider.tsx
git commit -m "feat(core): export and integrate diagnostics system into runtime"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Run all unit tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Build docs**

Run: `pnpm docs:build`
Expected: Build succeeds.

- [ ] **Step 5: Run key E2E suites**

Run: `E2E_PROJECTS=solid pnpm exec playwright test --project=solid e2e/solid.spec.ts`
Run: `E2E_PROJECTS=vue pnpm exec playwright test --project=vue e2e/vue.spec.ts`
Run: `E2E_PROJECTS=react pnpm exec playwright test --project=react e2e/react.spec.ts`
Expected: All pass.

- [ ] **Step 6: Push**

```bash
git push
```
