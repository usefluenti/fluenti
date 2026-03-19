# SolidJS Playground

A SolidJS SPA showcasing Fluenti i18n features with the Vite plugin.

## Running

```bash
# From monorepo root
pnpm playground:solid

# Or directly
cd examples/solid
pnpm dev
```

Dev server starts at `http://localhost:5174`.

## Features Demonstrated

- Compile-time `` t`...` `` tagged template translations
- `<Trans>`, `<Plural>`, `<Select>`, `<DateTime>`, `<NumberFormat>` components
- Reactive locale switching with Solid signals
- `useI18n()` hook with `t()`, `d()`, `n()`
- Lazy locale loading with `chunkLoader`

## Related Docs

- [SolidJS SPA Guide](/frameworks/solid/solid-spa/)
- [Quick Start](/start/quick-start/)
- [@fluenti/solid API](/api/solid/)
