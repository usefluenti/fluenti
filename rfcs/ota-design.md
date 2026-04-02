# RFC: Fluenti OTA (Over-The-Air) Translation Updates

- **Status**: Draft
- **Date**: 2026-04-02
- **Author**: Claude
- **Package**: `@fluenti/ota`

## Summary

Design an OTA mechanism that allows Fluenti applications to receive updated translations at runtime — without a full rebuild or redeploy. This enables translation teams to ship fixes and new translations independently of engineering release cycles.

## Motivation

Today Fluenti compiles translations at build time into JS functions (e.g., `(v) => \`Hello ${v.name}!\``). This is excellent for performance but creates a coupling: every translation change requires a rebuild and redeploy.

**Pain points:**

1. **Slow translation cycle** — Translators must wait for the next release to see fixes go live
2. **Hotfixes blocked** — A typo in production copy requires a full CI/CD pipeline run
3. **A/B testing** — No way to test translation variants without code changes
4. **Decoupled teams** — Translation teams want autonomy from engineering release schedules

## Design Principles

1. **Compile-time first** — OTA is an *enhancement*, not a replacement. Build-time catalogs remain the baseline; OTA patches on top
2. **Zero performance regression** — Apps without OTA enabled pay nothing. Apps with OTA still render instantly from build-time catalogs, then patch asynchronously
3. **Framework agnostic** — OTA logic lives in `@fluenti/core`, with thin framework adapters
4. **Secure by default** — Catalog payloads are signed; eval-free message format
5. **Incremental** — Only changed messages are fetched, not full catalogs

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Build Time                                │
│                                                                  │
│  fluenti compile ──► compiled catalogs (.js)                     │
│                  ──► catalog manifest (manifest.json)             │
│                  ──► upload to OTA backend (optional CI step)     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     OTA Backend / CDN                             │
│                                                                  │
│  POST /publish   ← CLI uploads new catalog version               │
│  GET  /manifest  → { version, locales, checksums }               │
│  GET  /patch/:locale/:fromVersion → incremental delta            │
│  GET  /catalog/:locale/:version   → full compiled catalog        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        Runtime                                   │
│                                                                  │
│  App boots ──► render with build-time catalog (instant)          │
│           ──► OTA client checks for updates (async, non-blocking)│
│           ──► if update found: merge patch → re-render affected  │
│           ──► cache patch in IndexedDB / localStorage            │
└──────────────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Catalog Manifest

At compile time, `fluenti compile` generates a `manifest.json` alongside compiled catalogs:

```jsonc
{
  "version": "20260402T153000Z",       // ISO timestamp or semver
  "buildId": "abc123",                  // git SHA or CI build ID
  "sourceLocale": "en",
  "locales": {
    "en": {
      "hash": "sha256:a1b2c3...",       // integrity hash of full catalog
      "messageCount": 142
    },
    "ja": {
      "hash": "sha256:d4e5f6...",
      "messageCount": 140
    },
    "zh-CN": {
      "hash": "sha256:g7h8i9...",
      "messageCount": 138
    }
  }
}
```

**Why a manifest?** The client needs a single lightweight check to determine if updates exist. Comparing a single version string is cheaper than fetching each locale catalog.

### 2. OTA Patch Format

OTA delivers **patches** — not full catalogs. A patch is a JSON object describing additions, updates, and deletions:

```jsonc
{
  "fromVersion": "20260401T120000Z",
  "toVersion": "20260402T153000Z",
  "locale": "ja",
  "integrity": "sha256:xyz...",         // hash of this patch payload
  "messages": {
    // Added or updated messages — values are ICU source strings
    "greeting": "こんにちは、{name}さん！",
    "items_count": "{count, plural, one {# アイテム} other {# アイテム}}"
  },
  "deleted": [
    "deprecated_key_123"
  ]
}
```

**Key decision: ICU source strings, not compiled JS functions.**

OTA payloads contain ICU MessageFormat source strings, not pre-compiled JS functions. This is critical for security — we never `eval()` or `new Function()` from a network response. The runtime compiles these on the client using the existing `interpolate()` function from `@fluenti/core/runtime`.

Trade-off matrix:

| Approach | Security | Performance | Bundle Size |
|----------|----------|-------------|-------------|
| **ICU source strings** (chosen) | Safe — no code execution | Runtime parsing (~2.5 KB parser) | +2.5 KB gzip |
| Pre-compiled JS functions | Dangerous — requires eval | Fastest | +0 KB |
| WASM-compiled messages | Safe | Fast after init | +15-30 KB |

The 2.5 KB parser cost is acceptable since OTA users already opt into a slightly larger runtime. The parser is the same `interpolate` from `@fluenti/core/runtime` that already exists for runtime ICU support.

### 3. Runtime OTA Client (`@fluenti/ota`)

New package: `packages/ota` — framework-agnostic OTA client.

```typescript
// packages/ota/src/types.ts

export interface OTAConfig {
  /** OTA endpoint base URL */
  endpoint: string

  /** Application ID (for multi-app backends) */
  appId?: string

  /** How often to poll for updates (ms). 0 = manual only. Default: 300_000 (5 min) */
  pollInterval?: number

  /** Strategy for applying updates */
  updateStrategy?: 'immediate' | 'next-navigation' | 'manual'

  /** Cache backend */
  cache?: 'indexeddb' | 'localstorage' | 'memory' | false

  /** Custom fetch function (for auth headers, etc.) */
  fetch?: typeof globalThis.fetch

  /** Called when an update is available but not yet applied (for 'manual' strategy) */
  onUpdateAvailable?: (info: UpdateInfo) => void

  /** Called after messages are patched into the runtime */
  onUpdateApplied?: (info: UpdateInfo) => void

  /** Called on fetch/parse errors */
  onError?: (error: OTAError) => void

  /** Integrity verification (default: true) */
  verifyIntegrity?: boolean
}

export interface UpdateInfo {
  fromVersion: string
  toVersion: string
  locales: string[]
  messageCount: number
}

export interface OTAClient {
  /** Check for updates and apply based on strategy */
  checkForUpdate(): Promise<UpdateInfo | null>

  /** Force-apply a pending update (for 'manual' strategy) */
  applyUpdate(): Promise<void>

  /** Get current catalog version */
  getVersion(): string

  /** Start polling (if pollInterval > 0) */
  startPolling(): void

  /** Stop polling */
  stopPolling(): void

  /** Destroy client, clean up timers */
  dispose(): void
}
```

#### Client Lifecycle

```typescript
import { createOTAClient } from '@fluenti/ota'
import { interpolate } from '@fluenti/core/runtime'

const ota = createOTAClient({
  endpoint: 'https://ota.example.com/v1',
  appId: 'my-app',
  pollInterval: 5 * 60 * 1000,  // 5 minutes
  updateStrategy: 'immediate',
  cache: 'indexeddb',
  onUpdateApplied({ toVersion, messageCount }) {
    console.log(`Applied ${messageCount} message updates (v${toVersion})`)
  }
})
```

#### Internal Flow

```
checkForUpdate()
  │
  ├─► GET /manifest?appId=my-app
  │     Response: { version: "v2", locales: { en: {...}, ja: {...} } }
  │
  ├─► Compare with cached version
  │     If same → return null (no update)
  │
  ├─► GET /patch/en/v1..v2   (for current locale)
  │     Response: { messages: {...}, deleted: [...] }
  │
  ├─► Verify integrity (SHA-256)
  │
  ├─► Compile ICU strings → CompiledMessage functions
  │     Uses interpolate() from @fluenti/core/runtime
  │     Wrapped in a safe compile function (no eval)
  │
  ├─► Apply to runtime via loadMessages()
  │     catalog.set(locale, patchedMessages)  ← existing API!
  │
  ├─► Cache patch + new version in IndexedDB
  │
  └─► Trigger re-render (framework-specific reactivity handles this)
```

### 4. Message Compilation at Runtime

The critical bridge: converting ICU source strings from OTA patches into `CompiledMessage` values that the runtime catalog understands.

```typescript
// packages/ota/src/compile-ota.ts

import type { CompiledMessage, Messages } from '@fluenti/core'

/**
 * Compile OTA patch messages (ICU strings) into runtime CompiledMessage format.
 *
 * Uses the existing ICU parser + compiler from @fluenti/core/runtime.
 * No eval() or new Function() — messages are parsed into an AST and
 * interpreted via the interpolation engine.
 */
export function compileOTAPatch(
  patch: Record<string, string>,
  locale: string,
  parse: ParseMessage,
): Messages {
  const compiled: Messages = Object.create(null)

  for (const [id, icuSource] of Object.entries(patch)) {
    if (typeof icuSource !== 'string') continue

    // Simple strings (no ICU syntax) → store as-is
    if (!icuSource.includes('{')) {
      compiled[id] = icuSource
      continue
    }

    // ICU messages → parse to AST, return interpreter function
    const ast = parse(icuSource)
    compiled[id] = ((values?: Record<string, unknown>) => {
      return interpretAST(ast, values ?? {}, locale)
    }) as CompiledMessage
  }

  return compiled
}
```

**Why not reuse the build-time compiler?** The build-time compiler in `@fluenti/cli` generates JS source code strings (meant to be written to `.js` files). At runtime, we need actual functions. We use the parser (`parse`) to get an AST, then interpret it directly — no codegen, no eval.

### 5. Caching Strategy

OTA patches are cached to avoid re-fetching on every page load:

```
IndexedDB: fluenti-ota
  ├── meta/
  │   └── {appId}: { currentVersion, lastCheck, locales[] }
  └── patches/
      ├── {appId}/{locale}/v1..v2: { messages, deleted, integrity }
      └── {appId}/{locale}/v2..v3: { messages, deleted, integrity }

On boot:
  1. Load cached version from IndexedDB
  2. Apply cached patches to build-time catalog (instant, sync)
  3. Check for new updates in background (async)
```

**Cache invalidation:**
- Patches are keyed by version range (`v1..v2`)
- When the app is rebuilt with a new build-time catalog, the `buildId` in the manifest changes
- On `buildId` mismatch, the entire cache is invalidated (new baseline)
- Maximum cache entries per locale: 10 (FIFO eviction)

### 6. Framework Integration

OTA plugs into existing framework providers with minimal API surface:

#### React

```tsx
import { I18nProvider } from '@fluenti/react'
import { createOTAClient } from '@fluenti/ota'
import { OTAProvider } from '@fluenti/ota/react'

const ota = createOTAClient({ endpoint: '...', pollInterval: 300_000 })

function App() {
  return (
    <I18nProvider locale="en" messages={messages}>
      <OTAProvider client={ota}>
        <MyApp />
      </OTAProvider>
    </I18nProvider>
  )
}
```

`<OTAProvider>` hooks into the `I18nProvider` context and calls `loadMessages()` when patches arrive. No changes to `useI18n()` or `t()` — existing reactivity handles re-renders.

#### Vue

```typescript
// main.ts
import { createFluenti } from '@fluenti/vue'
import { createOTAClient } from '@fluenti/ota'
import { useOTA } from '@fluenti/ota/vue'

const i18n = createFluenti({ locale: 'en', messages })
const ota = createOTAClient({ endpoint: '...' })

app.use(i18n)
app.use(useOTA(ota))  // Vue plugin that auto-wires to fluenti instance
```

#### Solid

```tsx
import { I18nProvider } from '@fluenti/solid'
import { createOTAClient } from '@fluenti/ota'
import { OTAProvider } from '@fluenti/ota/solid'

const ota = createOTAClient({ endpoint: '...' })

<I18nProvider locale="en" messages={messages}>
  <OTAProvider client={ota}>
    <App />
  </OTAProvider>
</I18nProvider>
```

### 7. CLI Integration

New CLI commands for OTA workflow:

```bash
# Generate manifest + upload to OTA backend
fluenti ota:publish --endpoint https://ota.example.com/v1 --app-id my-app

# Generate manifest only (for self-hosted / CDN)
fluenti ota:manifest --out ./dist/ota/

# Diff two catalog versions and generate patch files
fluenti ota:diff --from v1 --to v2 --out ./dist/ota/patches/
```

The `ota:publish` command:
1. Runs `fluenti compile` (if not already compiled)
2. Generates `manifest.json` with hashes
3. Computes diffs against previous version (fetched from backend)
4. Uploads manifest + patches to OTA endpoint

### 8. Self-Hosted CDN Mode

Not every team wants a managed OTA backend. Fluenti supports a **static file mode** where patches are served from any CDN:

```
/ota/
  manifest.json
  patches/
    en/
      v1..v2.json
      v2..v3.json
    ja/
      v1..v2.json
      v2..v3.json
  catalogs/
    en/
      v3.json          # full catalog (fallback)
    ja/
      v3.json
```

The CLI generates this directory structure. Upload it to S3, Cloudflare R2, or any static host. The OTA client works identically — it just fetches static JSON files instead of hitting an API.

```bash
fluenti ota:manifest --out ./dist/ota/
fluenti ota:diff --from v1 --to v2 --out ./dist/ota/patches/
# Deploy ./dist/ota/ to your CDN
```

### 9. Security Model

#### Integrity Verification

Every patch includes a SHA-256 hash. The client verifies before applying:

```typescript
async function verifyPatch(patch: OTAPatch): Promise<boolean> {
  const payload = JSON.stringify({ messages: patch.messages, deleted: patch.deleted })
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  const hex = 'sha256:' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === patch.integrity
}
```

#### No Code Execution

OTA payloads are **data only** — ICU source strings. The runtime parses them into an AST and interprets. There is no `eval()`, `new Function()`, or dynamic `<script>` injection.

#### Optional Signing

For enterprise deployments, patches can be signed with Ed25519:

```typescript
const ota = createOTAClient({
  endpoint: '...',
  // Public key for signature verification
  publicKey: 'MCowBQYDK2VwAyEA...',
})
```

The CLI signs patches during `ota:publish` using a private key from environment or keychain.

### 10. SSR Considerations

OTA patches are **client-side only**. On the server:

- SSR always uses the build-time catalog (deterministic, fast)
- The hydration script (`getSSRLocaleScript()`) is unchanged
- After hydration, the OTA client activates and patches if needed
- Small flash of stale translation (FOST) is possible but unlikely — patches are cached

For teams that need server-side OTA (rare), they can periodically re-fetch and warm a server-side cache:

```typescript
// server.ts (optional)
import { createOTAClient } from '@fluenti/ota'

const serverOTA = createOTAClient({
  endpoint: '...',
  cache: 'memory',       // In-memory for server
  pollInterval: 60_000,  // Check every minute
})

// In request handler
const messages = serverOTA.getCachedMessages(locale) ?? buildTimeMessages
```

### 11. Vite Plugin Integration

The `@fluenti/vite-plugin` gains an optional `ota` config:

```typescript
// fluenti.config.ts
export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'ja', 'zh-CN'],
  // ...existing config...

  ota: {
    /** Enable OTA manifest generation during build */
    enabled: true,

    /** OTA endpoint (injected into client bundle as env variable) */
    endpoint: process.env.FLUENTI_OTA_ENDPOINT,

    /** Include @fluenti/core/runtime parser in bundle (required for OTA) */
    includeRuntimeParser: true,  // auto-set when ota.enabled = true
  }
})
```

When `ota.enabled` is true, the Vite plugin:
1. Generates `manifest.json` during build
2. Includes the ICU runtime parser in the bundle (~2.5 KB gzip)
3. Injects OTA endpoint as `import.meta.env.FLUENTI_OTA_ENDPOINT`

## Package Structure

```
packages/ota/
  src/
    index.ts              # createOTAClient, types
    client.ts             # Core OTA client logic
    manifest.ts           # Manifest fetching & comparison
    patch.ts              # Patch fetching, verification, application
    compile-ota.ts        # ICU string → CompiledMessage (eval-free)
    cache/
      index.ts            # Cache interface
      indexeddb.ts         # IndexedDB adapter
      localstorage.ts     # localStorage adapter
      memory.ts           # In-memory adapter (SSR / testing)
    types.ts              # Public types
  react/
    index.ts              # OTAProvider for React
  vue/
    index.ts              # useOTA plugin for Vue
  solid/
    index.ts              # OTAProvider for Solid
  package.json
```

## Dependency Graph (Updated)

```
@fluenti/ota ──► @fluenti/core (runtime parser)
@fluenti/ota/react ──► @fluenti/ota + @fluenti/react
@fluenti/ota/vue ──► @fluenti/ota + @fluenti/vue
@fluenti/ota/solid ──► @fluenti/ota + @fluenti/solid
@fluenti/cli (ota:* commands) ──► @fluenti/core
```

## API Summary

### Client API (`@fluenti/ota`)

| Export | Description |
|--------|-------------|
| `createOTAClient(config)` | Create OTA client instance |
| `OTAConfig` | Configuration type |
| `OTAClient` | Client interface |
| `UpdateInfo` | Update metadata |

### CLI Commands

| Command | Description |
|---------|-------------|
| `fluenti ota:manifest` | Generate manifest.json from compiled catalogs |
| `fluenti ota:diff` | Generate patch files between two versions |
| `fluenti ota:publish` | Compile + generate manifest + upload to backend |

### Framework Adapters

| Package | Export | Description |
|---------|--------|-------------|
| `@fluenti/ota/react` | `<OTAProvider>` | React context provider |
| `@fluenti/ota/vue` | `useOTA()` | Vue plugin |
| `@fluenti/ota/solid` | `<OTAProvider>` | Solid context provider |

## Migration Path

1. **No breaking changes** — OTA is purely additive
2. **Opt-in** — Existing apps work unchanged; add `ota` config to enable
3. **Incremental adoption** — Start with manual checks, move to polling
4. **Bundle impact** — +2.5 KB gzip (ICU parser) + ~1.5 KB (OTA client) = ~4 KB total

## Open Questions

1. **Patch compaction** — Should we compact sequential patches (v1→v2→v3 → v1→v3)?
   - Recommendation: Yes, server-side. Client always fetches latest single patch.

2. **Per-namespace OTA** — Should patches support namespace scoping?
   - Recommendation: Yes, align with existing namespace support in Catalog.

3. **Rollback** — Should the client support rolling back to a previous OTA version?
   - Recommendation: Yes, cache previous patches. Expose `rollback()` on OTAClient.

4. **Rate limiting** — How to prevent thundering herd on CDN?
   - Recommendation: Jittered polling interval + `Cache-Control` headers + ETag support.

5. **Metrics** — Should the client report adoption metrics (% of users on latest)?
   - Recommendation: Optional callback `onMetrics()`, no built-in reporting.

## Implementation Plan

### Phase 1: Core + CLI (MVP)
- [ ] `@fluenti/ota` core client (fetch, verify, apply, cache)
- [ ] `compileOTAPatch()` — eval-free ICU compilation
- [ ] IndexedDB + localStorage + memory cache adapters
- [ ] `fluenti ota:manifest` CLI command
- [ ] `fluenti ota:diff` CLI command
- [ ] Unit tests (90% coverage)

### Phase 2: Framework Adapters
- [ ] `@fluenti/ota/react` — `<OTAProvider>`
- [ ] `@fluenti/ota/vue` — `useOTA()` plugin
- [ ] `@fluenti/ota/solid` — `<OTAProvider>`
- [ ] Integration tests with each framework

### Phase 3: Vite Plugin + DX
- [ ] `ota` config in `fluenti.config.ts`
- [ ] Auto-include runtime parser when OTA enabled
- [ ] `fluenti ota:publish` with backend upload
- [ ] Dev mode: simulate OTA patches via HMR

### Phase 4: Advanced
- [ ] Ed25519 patch signing
- [ ] Server-side OTA cache (for SSR)
- [ ] Patch compaction
- [ ] Rollback API
- [ ] Playground example
