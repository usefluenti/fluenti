# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-03-20

### Added

- Auto extract+compile before production builds (`buildAutoCompile` option in vite-plugin and next-plugin)
- Framework-specific vite-plugin subpaths (`@fluenti/vue/vite-plugin`, `@fluenti/solid/vite-plugin`, `@fluenti/react/vite-plugin`)
- Next.js locale-prefixed routing support
- Export `runCompile` and `loadConfig` from `@fluenti/cli` for programmatic usage

### Fixed

- Use bracket notation for numeric ICU argument names in compiled output
- Resolve CLI binary by walking up directory tree for monorepo support
- Handle CJS interop when dynamically importing `@fluenti/cli` in dev-runner
- Use `require()` instead of `import()` for `@fluenti/cli` in dev-runner for Node.js compatibility
- Use `node_modules/.bin/fluenti` instead of `npx` for CI compatibility
- Resolve E2E failures in `buildAutoCompile` and solid-splitting fixture

### Changed

- Rename `FluentProvider` to `I18nProvider` in `@fluenti/next` for API consistency
- Move dev-runner from `@fluenti/core` to `@fluenti/vite-plugin` and `@fluenti/next`
- Extract shared `config-loader` module in CLI

## [0.1.3] - 2026-03-19

### Fixed

- Rename `FluentProvider` to `I18nProvider` in `@fluenti/next`
- Move dev-runner to internal entry to avoid `node:child_process` in browser bundles
- Resolve E2E failures — CJS compat and `@__PURE__` annotation
- Remove broken msgid entries from solid example PO files
- Address code review findings (HIGH + MEDIUM issues)

## [0.1.2] - 2026-03-19

### Fixed

- Use relative paths in PO file source references

## [0.1.1] - 2026-03-19

### Fixed

- Skip commit/tag/push in release dry-run mode
- Remove unused `numericLiteral` function to fix typecheck
- Fix Fluent placeholder syntax and improve tagged template DX
- Address code review findings (HIGH + MEDIUM issues)

## [0.1.0] - 2026-03-17

### Added

- **@fluenti/core** — Framework-agnostic ICU MessageFormat parser, compiler, and interpolation engine
- **@fluenti/vue** — Vue 3 integration with `v-t` directive, `<Trans>`, `<Plural>`, `<Select>`, and `useI18n()` composable
- **@fluenti/react** — React integration with `I18nProvider`, `<Trans>`, `<Plural>`, `<Select>`, and `useI18n()` hook
- **@fluenti/solid** — SolidJS integration with `I18nProvider`, `<Trans>`, `<Plural>`, `<Select>`, and `useI18n()` hook
- **@fluenti/cli** — Message extraction from Vue SFC and TSX, PO/JSON catalog compilation, AI-powered translation and migration
- **@fluenti/vite-plugin** — Vite plugin with build-time transforms, virtual modules, and code splitting
- **@fluenti/next** — Next.js plugin with `withFluenti()`, RSC support, and streaming SSR
- **@fluenti/nuxt** — Nuxt module with locale-prefixed routing, SEO helpers, and auto locale detection
- **@fluenti/vue-i18n-compat** — Progressive migration bridge between vue-i18n and Fluenti
- Full ICU MessageFormat support: plurals, selects, nested arguments, custom formatters
- Code splitting strategies: `dynamic`, `static`, and off
- SSR-safe locale detection via cookie, query, path, or headers
- PO and JSON catalog formats
- Date and number formatting via `Intl` APIs
