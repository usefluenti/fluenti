# Contributing to Fluenti

Thank you for your interest in contributing to Fluenti! This guide will help you get started.

## Prerequisites

- **Node.js** >= 18
- **pnpm** (install via `corepack enable`)

## Development Setup

```bash
# Clone the repository
git clone https://github.com/usefluenti/fluenti.git
cd fluenti

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test
```

## Monorepo Structure

| Directory | Package | Description |
|-----------|---------|-------------|
| `packages/core` | `@fluenti/core` | Framework-agnostic core: ICU parser, compiler, interpolation |
| `packages/vue` | `@fluenti/vue` | Vue 3 integration |
| `packages/react` | `@fluenti/react` | React integration |
| `packages/solid` | `@fluenti/solid` | SolidJS integration |
| `packages/cli` | `@fluenti/cli` | Message extraction and compilation CLI |
| `packages/vite-plugin` | `@fluenti/vite-plugin` | Vite build-time transforms and virtual modules |
| `packages/next-plugin` | `@fluenti/next` | Next.js plugin |
| `packages/nuxt` | `@fluenti/nuxt` | Nuxt module |
| `apps/docs` | `@fluenti/docs` | Documentation site (Astro Starlight) |
| `examples/*` | — | Framework playground apps |

## Development Commands

```bash
# Build & watch all packages
pnpm dev

# Run tests for a specific package
pnpm --filter @fluenti/core test

# Run tests with coverage
pnpm --filter @fluenti/vue test -- --coverage

# Type-check all packages
pnpm typecheck

# Lint (oxlint)
pnpm lint

# Start playground apps
pnpm playground:vue    # port 5173
pnpm playground:solid  # port 5174

# Documentation
pnpm docs:dev          # port 8321
pnpm docs:build
```

## Testing Requirements

- **Minimum 80% coverage** for all packages (core requires 90%)
- Follow **TDD**: write tests first, then implement
- Run `pnpm test` before submitting a PR

## Code Style

- **Immutable data** — never mutate objects; always return new copies
- **File size** — keep files under 800 lines
- **Function size** — keep functions under 50 lines
- **No deep nesting** — maximum 4 levels of indentation
- **TypeScript strict mode** — all packages use `strict: true`
- **Type exports** — use `export type` for pure type exports (`verbatimModuleSyntax`)

## Pull Request Workflow

1. Fork the repository and create a feature branch
2. Follow [conventional commits](https://www.conventionalcommits.org/) for commit messages:
   - `feat:` — new feature
   - `fix:` — bug fix
   - `refactor:` — code change that neither fixes a bug nor adds a feature
   - `docs:` — documentation only
   - `test:` — adding or updating tests
   - `chore:` — maintenance tasks
3. Ensure all tests pass (`pnpm test`)
4. Ensure type-checking passes (`pnpm typecheck`)
5. Link related issues in your PR description
6. Keep PRs focused — one feature or fix per PR

## Documentation

Documentation lives in `apps/docs/` and uses [Astro Starlight](https://starlight.astro.build/).

- Content files are MDX format in `src/content/docs/`
- Use `<Tabs>` and `<TabItem>` from Starlight for multi-framework code examples
- Code examples must match actual API signatures
- Run `pnpm docs:build` to verify your changes compile

## Questions?

Open a [GitHub issue](https://github.com/usefluenti/fluenti/issues) for bugs, feature requests, or questions.
