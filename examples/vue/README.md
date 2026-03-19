# Vue 3 Playground

A Vue 3 SPA showcasing all Fluenti i18n features with the Vite plugin.

## Running

```bash
# From monorepo root
pnpm playground:vue

# Or directly
cd examples/vue
pnpm dev
```

Dev server starts at `http://localhost:5173`.

## Features Demonstrated

- `v-t` compile-time directive for template translations
- `<Trans>`, `<Plural>`, `<Select>`, `<DateTime>`, `<NumberFormat>` components
- `useI18n()` composable with `t()`, `d()`, `n()`
- Lazy locale loading with `chunkLoader`
- Component prefix customization
- Date and number formatting

## Related Docs

- [v-t Directive Guide](/frameworks/vue/v-t-directive/)
- [Quick Start](/start/quick-start/)
- [@fluenti/vue API](/api/vue/)
