# Feature Gaps Fix — Design Spec

**Date**: 2026-03-23
**Goal**: Fix 5 features that are defined/documented but not functional, prior to 0.3.0 release

> **Note**: Original audit identified 6 gaps. Item "Solid component exports" was a false positive — `Trans`, `Plural`, `Select` are already exported from `@fluenti/solid`. Remaining: 5 fixes.

## 1. `msg` Tagged Template Extraction

**Problem**: `msg\`Administrator\`` creates a valid message descriptor at runtime, but the CLI `extract` command ignores it — messages defined with `msg` never enter PO catalogs.

**Fix**: Extend `collectDirectImportTBindings()` in `packages/cli/src/tsx-extractor.ts` to also collect `msg` bindings from `@fluenti/*` imports.

### Changes

**`packages/cli/src/tsx-extractor.ts`**:
- `collectDirectImportTBindings()` → rename to `collectDirectBindings()`, return a `Map<string, 't' | 'msg'>` instead of `Set<string>` so we know which binding is which
- Match both `t` and `msg` imported names (including aliases like `import { msg as defineMessage }`)
- In the `TaggedTemplateExpression` handler: check against the expanded binding map. Both `t` and `msg` tagged templates use the same `extractTaggedTemplateMessage()` logic
- **Only TaggedTemplateExpression** — `msg` bindings must NOT trigger in the `CallExpression` handler (unlike `t`, `msg` has no `msg()` call form for extraction)
- When the binding is `msg`, set `comment: 'msg tagged template'` on the `ExtractedDescriptor`. The PO serializer handles the `#.` prefix — do not bake PO-specific formatting into the extractor

**`packages/cli/src/vue-extractor.ts`**:
- No changes needed. The Vue extractor already delegates `<script setup>` blocks to `extractFromTsx()`, so `msg` extraction is handled automatically once tsx-extractor is updated.

**Tests**:
- `packages/cli/tests/tsx-extractor.test.ts`: add test cases for:
  - `msg\`text\`` basic extraction
  - `import { msg as defineMessage }` alias extraction
  - `msg` in CallExpression is NOT extracted (negative test)
  - Extracted message has `comment` field

### Scope
- ~20 lines changed in tsx-extractor
- 0 lines in vue-extractor (handled via delegation)
- ~40 lines of new tests

---

## 2. Plugin Hooks Integration

**Problem**: `FluentiPlugin` interface defines hooks but the CLI never calls them.

**Fix**: Wire plugin hooks into the CLI extract/compile pipeline. Use the existing type signatures exactly.

### Existing Types (from `packages/core/src/types.ts`)

```typescript
interface PluginExtractContext {
  readonly messages: Map<string, ExtractedMessage> | Record<string, string>
  readonly sourceLocale: string
  readonly targetLocales: readonly string[]
  readonly config?: FluentiConfig
}

interface PluginCompileContext {
  readonly locale: string
  readonly messages: Record<string, CompiledMessage>
  readonly outDir: string
  readonly config?: FluentiConfig
}

interface FluentiPlugin {
  readonly name: string
  onAfterExtract?(context: PluginExtractContext): void | Promise<void>
  onBeforeCompile?(context: PluginCompileContext): void | Promise<void>
  onAfterCompile?(context: PluginCompileContext): void | Promise<void>
  transformMessages?(messages: Record<string, string>, locale: string): Record<string, string> | Promise<Record<string, string>>
  formatters?: Record<string, CustomFormatter>
}
```

### Changes

**`packages/cli/src/cli.ts`** (extract command):
- After extraction completes, iterate `config.plugins` and call:
  ```ts
  plugin.onAfterExtract?.({ messages, sourceLocale: config.sourceLocale, targetLocales: config.locales, config })
  ```

**`packages/cli/src/cli.ts`** (compile command):
- Before compiling each locale:
  ```ts
  plugin.onBeforeCompile?.({ locale, messages: compiledMessages, outDir: config.compileOutDir, config })
  ```
- During compilation, apply `transformMessages`:
  ```ts
  const transformed = await plugin.transformMessages?.(rawMessages, locale) ?? rawMessages
  ```
- After compiling each locale:
  ```ts
  plugin.onAfterCompile?.({ locale, messages: compiledMessages, outDir: config.compileOutDir, config })
  ```

**Runtime formatter registration** — deferred to a future release. Reason: `plugins` lives on `FluentiConfig` (build config) but not on `FluentiCoreConfigFull` (runtime config). Adding plugins to the runtime config is a larger design change. For 0.3.0, plugin hooks work at build time only. The `formatters` field on `FluentiPlugin` will be documented as "planned" and type-checked but not wired to runtime.

**Tests**:
- `packages/cli/tests/plugin-hooks.test.ts`: new test file
  - Verify `onAfterExtract` is called with correct context shape
  - Verify `onBeforeCompile` / `onAfterCompile` called per locale
  - Verify `transformMessages` output replaces input messages
  - Verify plugin ordering (iterate in array order)
  - Verify async hooks are awaited

### Scope
- ~50 lines in CLI
- ~100 lines of new tests
- No changes to core runtime (deferred)

---

## 3. Diagnostics System Export & Integration

**Problem**: `packages/core/src/diagnostics.ts` has a full implementation but is not exported and not wired into the runtime.

**Fix**: Export diagnostics and integrate into `createFluentiCore()`.

### Changes

**`packages/core/src/types.ts`**:
- Add `diagnostics?: DiagnosticsConfig` to `FluentiCoreConfigFull`

**`packages/core/src/index.ts`**:
- Add exports: `createDiagnostics`, `type DiagnosticEvent`, `type DiagnosticsConfig`, `type Diagnostics`
- In `createFluentiCore()`:
  - If `config.diagnostics` is provided, create a diagnostics instance
  - Wire into existing `warnMissing()` function (the single centralized console.warn at ~line 177) — call `diagnostics.missingKey()` instead of / in addition to console.warn
  - Wire into `lookupCatalog()` — call `diagnostics.fallbackUsed()` when a fallback locale is used (currently silent)
  - Expose `diagnostics` on the returned instance for external consumers

**Framework providers**:
- **Vue** (`packages/vue/src/plugin.ts`): Vue has its own translation logic, does not use `createFluentiCore()`. Accept `diagnostics` in `createFluenti()` options and wire into Vue's own missing key path.
- **React** (`packages/react/src/provider.tsx`): The `InlineProvider` creates a core instance — pass `diagnostics` through. The `InstanceProvider` takes a pre-built instance — diagnostics comes from the instance.
- **Solid** (`packages/solid/src/provider.tsx`): Similar to React — pass `diagnostics` to core instance creation.

**Tests**:
- `packages/core/tests/diagnostics.test.ts`: verify existing tests, add integration test
  - Create core with diagnostics config → trigger missing key → verify diagnostic event fires
  - Create core with diagnostics config → use fallback locale → verify fallbackUsed event fires

### Scope
- ~5 lines for type addition
- ~5 lines for exports
- ~20 lines in createFluentiCore
- ~15 lines across Vue/React/Solid providers
- ~30 lines of new integration tests

---

## 4. `idGenerator` Config Support

**Problem**: `FluentiConfig.idGenerator` is defined in types but compilation always uses hardcoded `hashMessage()`.

**Important distinction**: There are TWO different hash functions:
- `createMessageId(message, context)` — generates the catalog key (the message "id"). This is what `idGenerator` replaces.
- `hashMessage(id)` — generates a short hash from the id for use as a JS export name (e.g., `_abc123`). This stays hardcoded.

**Fix**: Pass `config.idGenerator` as a replacement for `createMessageId()` in both extraction and compilation.

### Call sites for `createMessageId()` (all must be updated)

1. `packages/cli/src/tsx-extractor.ts` — `extractTaggedTemplateMessage()`, `descriptorFromStaticParts()`
2. `packages/cli/src/vue-extractor.ts` — 5 call sites for message ID generation
3. `packages/cli/src/compile.ts` — used during catalog key resolution

### Changes

**`packages/cli/src/tsx-extractor.ts`**:
- `extractFromTsx()` accepts optional `idGenerator` parameter
- Pass it to `extractTaggedTemplateMessage()` and `descriptorFromStaticParts()` to use instead of `createMessageId()`

**`packages/cli/src/vue-extractor.ts`**:
- `extractFromVue()` accepts optional `idGenerator` parameter
- Pass it to all 5 call sites of `createMessageId()`

**`packages/cli/src/compile.ts`**:
- `compileCatalog()` accepts optional `idGenerator` parameter
- Use it for catalog key resolution instead of `createMessageId()`

**`packages/cli/src/cli.ts`**:
- Pass `config.idGenerator` to extract and compile functions

**`packages/cli/src/po-format.ts`**:
- Verify PO reader/writer roundtrips correctly with custom IDs. The PO format uses `hashMessage()` for export names (line 53, 57, 193) — this is independent of `idGenerator` and should NOT change. But verify that reading a PO file with custom-generated IDs doesn't break.

**Critical constraint**: The same `idGenerator` MUST be used for both extraction and compilation. Document this in the config type JSDoc.

**Tests**:
- `packages/cli/tests/compile.test.ts`: custom idGenerator → verify output uses custom IDs
- `packages/cli/tests/tsx-extractor.test.ts`: custom idGenerator → verify extracted IDs match
- `packages/cli/tests/po-format.test.ts`: roundtrip test with custom IDs (extract → write PO → read PO → compile)

### Scope
- ~15 lines in tsx-extractor
- ~15 lines in vue-extractor
- ~10 lines in compile.ts
- ~10 lines in cli.ts
- ~50 lines of new tests

---

## 5. `per-route` Splitting Strategy

**Problem**: Vite plugin internally supports `per-route` splitting via `route-resolve.ts`, but the config type only allows `'dynamic' | 'static' | false`.

**Fix**: Add `'per-route'` to the public config type and remove the internal-only type alias.

### Changes

**`packages/core/src/types.ts`**:
- Change `splitting?: 'dynamic' | 'static' | false` to `splitting?: 'dynamic' | 'static' | 'per-route' | false`

**`packages/vite-plugin/src/index.ts`**:
- Remove `InternalSplitStrategy` type alias (it becomes identical to `FluentiBuildConfig['splitting']`)
- Replace all usages of `InternalSplitStrategy` with `FluentiBuildConfig['splitting']`

**Documentation**:
- `apps/docs/src/content/docs/api/vite-plugin.mdx` — verify `per-route` is covered (it was added in recent docs expansion)

**Tests**:
- Verify existing `packages/vite-plugin/tests/per-route-splitting.test.ts` passes with the public type

### Scope
- ~2 lines in core/types.ts
- ~5 lines in vite-plugin (remove type alias, update references)

---

## Implementation Order

1. **`per-route` type** (5) — trivial, instant win
2. **`msg` extraction** (1) — small, self-contained
3. **`idGenerator`** (4) — small, related to extraction/compilation
4. **Plugin hooks** (2) — medium, touches CLI pipeline
5. **Diagnostics** (3) — medium, touches core + 3 framework packages

Items 1-3 are independent and can be parallelized. Items 4-5 should be done sequentially (plugin formatters may interact with diagnostics in a future release).

## Testing Strategy

- Each fix includes unit tests for the specific change
- Run full `pnpm test` after all changes
- Run `pnpm lint` and `pnpm typecheck`
- Run key E2E suites (solid, vue, react) to verify no regressions
- Coverage must not decrease
- PO format roundtrip test with custom idGenerator (critical)

## Files Touched (Summary)

| Package | Files |
|---------|-------|
| `@fluenti/cli` | `src/tsx-extractor.ts`, `src/vue-extractor.ts`, `src/compile.ts`, `src/cli.ts` |
| `@fluenti/core` | `src/types.ts`, `src/index.ts` |
| `@fluenti/vite-plugin` | `src/index.ts` |
| `@fluenti/vue` | `src/plugin.ts` |
| `@fluenti/react` | `src/provider.tsx` |
| `@fluenti/solid` | `src/provider.tsx` |
