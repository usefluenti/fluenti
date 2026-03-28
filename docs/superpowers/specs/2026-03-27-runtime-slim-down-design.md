# Runtime Slim-Down: Beat Lingui's Bundle Size

**Date**: 2026-03-27
**Goal**: Total runtime (core + framework) < 3 KB gzip, beating Lingui's ~3.3 KB

## Current State

| Package | Raw | Gzip |
|---------|-----|------|
| @fluenti/core | 19.0 KB | 5.97 KB |
| @fluenti/react | 9.6 KB | 3.07 KB |
| **Total (React app)** | **28.6 KB** | **9.04 KB** |
| Lingui total (React) | — | **~3.3 KB** |

## Root Cause

The main entry (`@fluenti/core`) bundles build-time code (ICU parser, compiler, interpolate) and optional features (SSR, formatters, diagnostics) that should never reach the browser.

## Strategy: Compile-Time Maximalism

Everything the compiler can do, the runtime must NOT do. The runtime is a thin lookup layer.

## Architecture Changes

### 1. Core Package Subpath Split

```
@fluenti/core          → Minimal runtime (~1.5 KB gzip target)
@fluenti/core/ssr      → SSR detection + hydration script
@fluenti/core/formatters → Intl.DateTimeFormat / NumberFormat / RelativeTimeFormat wrappers
@fluenti/core/internal → Parser, compiler, interpolate, ICU builders (build tools only)
```

#### Minimal Runtime (`@fluenti/core`) contains ONLY:

| Module | LOC (est.) | Purpose |
|--------|-----------|---------|
| catalog.ts | ~45 | Message storage (Map-based) |
| plural.ts | ~60 | `Intl.PluralRules` wrapper + category resolution |
| locale.ts (slim) | ~80 | `negotiateLocale`, `parseLocale`, `isRTL`, `validateLocale` |
| identity.ts | ~40 | FNV-1a hash (needed for `t` tagged template → hash lookup) |
| index.ts (slim) | ~100 | `createFluentiCore()` factory with slim `t()`, `resolveMessage()` |
| **Total** | **~325** | **Target: ~1.5 KB gzip** |

#### What moves OUT of main entry:

| Module | Destination | Reason |
|--------|-------------|--------|
| parser.ts (354 LOC) | `/internal` | Build-time only |
| compile.ts (234 LOC) | `/internal` | Build-time only |
| interpolate.ts (93 LOC) | `/internal` | Used by parser pipeline |
| lru.ts (60 LOC) | `/internal` | Only needed for interpolation cache |
| ssr.ts (187 LOC) | `/ssr` | Server-only |
| formatters/*.ts (~200 LOC) | `/formatters` | Optional, tree-shakeable |
| msg.descriptor() | `/internal` | Build-time descriptor creation |
| diagnostics | `/internal` | Dev-time only |
| buildICUPluralMessage | `/internal` | Build-time only (after component compile-time elimination) |
| buildICUSelectMessage | `/internal` | Build-time only |

### 2. Runtime `t()` Simplification

Current `t()` flow:
```
t(id, values) → catalog.get(locale, id)
  → MISS → descriptor.message → interpolate() → parse() → compile() → execute
```

New `t()` flow:
```
t(id, values) → catalog.get(locale, id)
  → HIT: call compiled function with values → done
  → MISS: return fallback string (no parsing)
```

The runtime `t()` no longer does ICU parsing. All messages MUST be pre-compiled in the catalog. If a message is missing, it returns the ID (dev warning) or empty string (prod).

#### Lightweight Plural Fallback

For the edge case where `<Plural>`/`<Select>` components run without build-time transformation (e.g., in tests or dev without Vite plugin), provide a ~30 LOC inline plural resolver that uses `Intl.PluralRules` directly — NOT the full ICU parser.

```ts
// ~30 LOC: resolve plural without ICU parser
function resolvePluralFallback(
  locale: string,
  count: number,
  forms: Record<string, string>,
  offset?: number,
): string {
  const adjusted = count - (offset ?? 0)
  // Exact match first
  if (forms[`=${count}`]) return forms[`=${count}`]
  // CLDR category
  const category = new Intl.PluralRules(locale).select(adjusted)
  return (forms[category] ?? forms.other ?? '').replace('#', String(adjusted))
}
```

### 3. Compile-Time Component Elimination

#### `<Plural>` Transform (SFC + JSX)

Before (current — emits ICU string at runtime):
```jsx
<Plural value={count} one="# item" other="# items" />
// Runtime: buildICUPluralMessage() → t({ message: '{count,plural,...}' })
```

After (new — emits pre-computed catalog lookup):
```jsx
// Build-time transform output:
t('_hashOfPluralMessage', { count })
// The ICU message is extracted + compiled into the catalog at build time
```

The SFC transform (`sfc-transform.ts`) and build transform already know the plural forms at compile time. Instead of emitting `t({ message: ICU })`, emit `t(hashId, { count })` and ensure the message is in the extraction output.

#### `<Select>` Transform

Same pattern:
```jsx
<Select value={gender} male="He" female="She" other="They" />
// → t('_hashOfSelectMessage', { gender })
```

### 4. React Package Slim-Down

```
@fluenti/react              → Minimal runtime (~0.8 KB gzip target)
@fluenti/react/components   → Trans, Plural, Select, DateTime, Number (optional)
```

#### Minimal Runtime (`@fluenti/react`) contains ONLY:

| Module | LOC (est.) | Purpose |
|--------|-----------|---------|
| provider.tsx (slim) | ~80 | I18nProvider — context + locale state + subscription |
| context.ts | ~4 | React.createContext |
| hooks/useI18n.ts | ~20 | Public hook |
| create-fluenti.ts (slim) | ~80 | Factory for standalone setup |
| **Total** | **~184** | **Target: ~0.8 KB gzip** |

#### What moves OUT:

| Module | Destination | Reason |
|--------|-------------|--------|
| Trans.tsx + trans-core.ts | `/components` | Optional (compile-time handles most cases) |
| Plural.tsx + plural-core.ts | `/components` | Optional (compile-time eliminates) |
| Select.tsx | `/components` | Optional (compile-time eliminates) |
| DateTime.tsx | `/components` | Optional |
| Number.tsx | `/components` | Optional |
| icu-rich.tsx | `/components` | Optional (only for Trans) |
| global-registry.ts | Internal | Vite plugin only |
| __useI18n.ts | Internal | Vite plugin generated code only |

### 5. Package.json Exports Map

#### @fluenti/core
```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./ssr": { "import": "./dist/ssr.js", "types": "./dist/ssr.d.ts" },
    "./formatters": { "import": "./dist/formatters.js", "types": "./dist/formatters.d.ts" },
    "./internal": { "import": "./dist/internal.js", "types": "./dist/internal.d.ts" },
    "./transform": { "import": "./dist/transform.js", "types": "./dist/transform.d.ts" },
    "./transform/browser": { "import": "./dist/transform-browser.js" },
    "./config": { "import": "./dist/config.js", "types": "./dist/config.d.ts" }
  }
}
```

#### @fluenti/react
```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./components": { "import": "./dist/components.js", "types": "./dist/components.d.ts" },
    "./server": { "import": "./dist/server.js", "types": "./dist/server.d.ts" },
    "./vite-plugin": { "import": "./dist/vite-plugin.js", "types": "./dist/vite-plugin.d.ts" }
  }
}
```

### 6. Vue & Solid — Same Pattern

Apply identical subpath splitting to `@fluenti/vue` and `@fluenti/solid`:
- Main entry: Provider + useI18n + plugin (Vue)
- `/components`: Trans, Plural, Select, DateTime, NumberFormat
- `/server`: SSR utilities

## Target Bundle Sizes

| Package | Current (gzip) | Target (gzip) | Reduction |
|---------|---------------|---------------|-----------|
| @fluenti/core | 5.97 KB | **~1.5 KB** | -75% |
| @fluenti/react | 3.07 KB | **~0.8 KB** | -74% |
| **Total** | **9.04 KB** | **~2.3 KB** | **-75%** |
| Lingui total | — | **~3.3 KB** | **We win by ~30%** |

## Migration / Breaking Changes

### Import Changes Required

```ts
// Before
import { detectLocale, getSSRLocaleScript } from '@fluenti/core'
import { Trans, Plural, Select } from '@fluenti/react'

// After
import { detectLocale, getSSRLocaleScript } from '@fluenti/core/ssr'
import { Trans, Plural, Select } from '@fluenti/react/components'
```

### Re-export Shim (Temporary)

For backward compatibility during migration, the main entry CAN re-export from subpaths with `/** @deprecated */` JSDoc. Bundlers will tree-shake unused re-exports. Remove in next major version.

**Decision: No shim.** This is a semver-minor change since subpath exports are additive. The old imports continue to work until we explicitly remove them in a major version. We just need to ensure tree-shaking works — verify with bundler analysis.

Actually, **this IS breaking** if we remove exports from the main entry. Two options:
1. Keep re-exports in main entry (tree-shaking removes them) — safest
2. Remove from main entry — breaking, needs major version

**Decision: Option 1** — keep re-exports with `@deprecated` tags. The main entry re-exports from subpaths. Tree-shaking removes unused ones. No breaking change. We can remove in v2.

Wait — re-exports defeat the purpose. If someone imports `parse` from `@fluenti/core`, the bundler MUST include it even if they don't use it... unless the bundler supports sideEffects: false tree-shaking of re-exports.

**Final decision: Remove from main entry.** The parser/compiler/SSR/formatters are removed from the main entry file. They are available ONLY via subpath imports. This is a **breaking change** for anyone importing `parse`, `compile`, `interpolate`, `detectLocale`, `formatDate`, etc. from `@fluenti/core`. Mark as breaking in changelog.

Since this is pre-1.0, breaking changes are expected. Proceed.

## Implementation Order

1. Create new entry files for subpaths (core/ssr, core/formatters, core/internal)
2. Move code out of main entries
3. Update `createFluentiCore()` to remove parser dependency
4. Add lightweight plural/select fallback
5. Update compile-time transforms to emit hash-based lookups for Plural/Select
6. Update framework package entries (react, vue, solid)
7. Update package.json exports maps
8. Update tsup build config
9. Update all internal imports across packages
10. Update tests
11. Update examples
12. Measure final bundle sizes
13. Update documentation

## Verification

After implementation, verify with:
```bash
# Build all packages
pnpm build

# Check gzip sizes of dist outputs
gzip -c packages/core/dist/index.js | wc -c
gzip -c packages/react/dist/index.js | wc -c

# Run all tests
pnpm test

# Run examples to verify nothing is broken
pnpm example:react
pnpm example:vue
```
