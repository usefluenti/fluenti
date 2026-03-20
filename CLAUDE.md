# Fluenti — Compile-time i18n for modern frameworks

## Monorepo Structure

| Path | Package | Description |
|------|---------|-------------|
| `packages/core` | `@fluenti/core` | Framework-agnostic core: ICU parser, compiler, interpolation, plural/select, formatters, SSR |
| `packages/vue` | `@fluenti/vue` | Vue 3 integration: `<Trans>`, `<Plural>`, `<Select>`, `useI18n()`, plugin + `@fluenti/vue/vite-plugin` subpath |
| `packages/solid` | `@fluenti/solid` | SolidJS integration: `<Trans>`, `<Plural>`, `<Select>`, `I18nProvider`, `useI18n()` + `@fluenti/solid/vite-plugin` subpath |
| `packages/react` | `@fluenti/react` | React integration: `I18nProvider`, `useI18n`, `Trans/Plural/Select` + `@fluenti/react/vite-plugin` subpath |
| `packages/cli` | `@fluenti/cli` | Message extraction (Vue SFC + TSX), PO/JSON catalog format, compilation |
| `packages/vite-plugin` | `@fluenti/vite-plugin` | Vite plugin core: virtual modules, build-time transforms, code splitting (framework-agnostic) |
| `packages/next-plugin` | `@fluenti/next` | Next.js plugin: `withFluenti()`, webpack loader for `t\`\``, I18nProvider, RSC support |
| `examples/vue` | `playground-vue` | Vue 3 demo app showcasing all i18n features |
| `examples/solid` | `playground-solid` | SolidJS demo app showcasing all i18n features |
| `examples/react` | `playground-react` | React 19 SPA demo with PO format + CLI workflow |
| `examples/nextjs` | `playground-nextjs` | Next.js 15 App Router demo with RSC, streaming, server actions |
| `examples/react-router` | `playground-react-router` | React Router v7 SPA demo with client-side routing |
| `examples/tanstack-start` | `playground-tanstack-start` | TanStack Start demo with file-based routing and SSR |
| `examples/nuxt` | `playground-nuxt` | Nuxt 3 SSR demo with cookie-based locale detection |
| `examples/solid-start` | `playground-solid-start` | SolidStart SSR demo with hydration |
| `apps/docs` | `@fluenti/docs` | Documentation site (Astro Starlight) |

## Dependency Graph

```
examples/vue  ──► @fluenti/vue (+ vue/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
examples/solid ──► @fluenti/solid (+ solid/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
examples/react ──► @fluenti/react (+ react/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
examples/nextjs ──► @fluenti/next ──► @fluenti/react ──► @fluenti/core (+ next)
examples/react-router ──► @fluenti/react (+ react/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
examples/tanstack-start ──► @fluenti/react (+ react/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
examples/nuxt ──► @fluenti/vue (+ vue/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core (+ nuxt)
examples/solid-start ──► @fluenti/solid (+ solid/vite-plugin) ──► @fluenti/vite-plugin ──► @fluenti/core
apps/docs (standalone)
@fluenti/cli ──► @fluenti/core
@fluenti/vue ──► @fluenti/vite-plugin ──► @fluenti/core
@fluenti/solid ──► @fluenti/vite-plugin ──► @fluenti/core
@fluenti/react ──► @fluenti/vite-plugin ──► @fluenti/core
```

## Tech Stack

- **Language**: TypeScript 5.9 (`strict`, `verbatimModuleSyntax`, target ES2022)
- **Build**: tsup 8 (packages), Vite 8 (playgrounds), Astro 6 + Starlight (docs)
- **Test**: Vitest 4, happy-dom (vue/solid), @vue/test-utils, @solidjs/testing-library
- **Lint**: oxlint
- **Package manager**: pnpm (workspace protocol)

## Commands

```bash
# Build & Dev
pnpm build                  # Build all packages
pnpm dev                    # Watch-mode build all packages
pnpm playground:vue         # Start Vue playground (port 5173)
pnpm playground:solid       # Start Solid playground (port 5174)
pnpm docs:dev               # Start docs site (port 8321)
pnpm docs:build             # Build docs site

# Quality
pnpm test                   # Run all package tests
pnpm test:watch             # Vitest watch mode (root)
pnpm lint                   # oxlint --fix
pnpm typecheck              # tsc --noEmit across all packages

# Per-package
pnpm --filter @fluenti/core test
pnpm --filter @fluenti/vue test -- --coverage
```

## Dev Server Lifecycle

**IMPORTANT**: Dev servers (`pnpm playground:vue`, `pnpm playground:solid`, `pnpm docs:dev`) are long-running processes. When started in background for testing, **always kill them when done**:

```bash
# Start in background, capture PID
pnpm playground:vue &
DEV_PID=$!

# ... do your testing ...

# Kill when done — DO NOT leave hanging
kill $DEV_PID
```

If you forgot to capture the PID:
```bash
# Find and kill by port
lsof -ti:5173 | xargs kill   # playground-vue
lsof -ti:5174 | xargs kill   # playground-solid
lsof -ti:8321 | xargs kill   # docs
```

## Coverage Thresholds

| Package | Lines | Branches | Functions | Statements |
|---------|-------|----------|-----------|------------|
| core | 90% | 85% | 90% | 90% |
| vue | 80% | 75% | 80% | 80% |
| solid | 80% | 75% | 80% | 80% |
| react | 80% | 75% | 80% | 80% |
| cli | 70% | 65% | 70% | 70% |
| vite-plugin | 70% | 65% | 70% | 70% |
| next-plugin | 70% | 65% | 70% | 70% |
| nuxt | 70% | 65% | 70% | 70% |
| vue-i18n-compat | 80% | 75% | 80% | 80% |

## Core Architecture

- **Compile-time DX**: Messages are compiled at build time, not interpreted at runtime
- **`v-t` is a `nodeTransform`**, not a runtime directive — it rewrites templates during compilation
- **SSR-safe**: Locale detection via cookie/query/path/headers; hydration script helper
- **ICU MessageFormat**: Full support for plurals, selects, nested arguments, custom formatters
- **Hash-based message IDs**: Deterministic IDs generated from message content + context
- **PO format**: gettext-compatible catalog format (also supports JSON)
- **Code splitting**: Messages can be split per-route via `'dynamic' | 'static' | false` strategies
- **Virtual modules**: `@fluenti/vite-plugin` serves compiled catalogs via Vite virtual modules

## Type Contract

`packages/core/src/types.ts` is the **single source of truth** for all shared types. Framework packages re-export from core. Never duplicate type definitions.

## Locales

- **Source language**: `en`
- **Target languages**: `ja`, `zh-CN`
- **Catalog directory**: `locales/`

## Screenshots

All browser screenshots MUST be saved with the `screenshots/` prefix in the filename (e.g., `screenshots/hero-dark.png`). Never save screenshots to the project root.

## Coding Conventions

- **Immutable data**: Never mutate — always return new objects
- **File size**: < 800 lines per file
- **Function size**: < 50 lines per function
- **TDD**: Write tests first, then implement
- **Type exports**: Use `export type` for pure type exports (`verbatimModuleSyntax`)
- **No deep nesting**: Maximum 4 levels of indentation

## Agent Dispatch

Use project agents proactively based on the task:

| Trigger | Agent | Auto-dispatch |
|---------|-------|---------------|
| Code changes in `packages/*` | `npm-package-dev` | Yes — any work under `packages/` |
| After code changes in `packages/*` | `code-reviewer` | Yes — review after implementation |
| Code changes in `examples/*` | `playground-dev` | Yes — any work under `examples/*` |
| Write or update documentation MDX | `docs-writer` | Yes — content in `apps/docs/src/content/docs/` |
| Design playground UI/branding (Pencil) | `ui-designer` | On visual design requests for playgrounds |
| Design docs site theme/layout (Pencil) | `docs-designer` | On visual design requests for docs |
| Verify app in browser (QA) | `browser-tester` | After UI changes to playgrounds or docs |
| Security audit / pentest | `pentest` | Before releases or after parser/interpolation changes |
| Run/debug E2E tests | `e2e-runner` | After playground or fixture changes |
| Review examples for parity/quality | `examples-reviewer` | Yes — after bulk changes to examples/* |
| CI/CD pipeline issues | `ci-pipeline` | On workflow file changes or CI failures |

**Parallel dispatch**: When a task spans multiple scopes, dispatch agents in parallel (e.g., `npm-package-dev` + `playground-dev`).

## Future Roadmap

Planned framework integrations (not yet created):

- `packages/svelte` — Svelte 5+ integration (context-based provider / components)
- `examples/svelte` — Svelte demo app

New framework packages follow the same pattern as `vue` / `solid`: provider → hook → components → plugin → tests, with 80% coverage threshold. See the `npm-package-dev` agent for step-by-step guidance on creating new framework packages.
