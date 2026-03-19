# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-03-19

### Fixed

- Use relative paths in PO file source references
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
