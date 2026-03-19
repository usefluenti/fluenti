# React SPA Playground

A React 19 single-page application demonstrating Fluenti's i18n features with the Vite plugin.

## Running

```bash
# From monorepo root
pnpm playground:react

# Or directly
cd examples/react
pnpm dev
```

Dev server starts at `http://localhost:5175`.

## Features Demonstrated

- Compile-time `` t`...` `` tagged template translations
- `<Trans>`, `<Plural>`, and `<Select>` components
- PO format catalogs with CLI extraction workflow
- Date and number formatting with `d()` and `n()`
- Locale switching with cookie persistence

## Related Docs

- [React SPA Guide](/frameworks/react/react-spa/)
- [Quick Start](/start/quick-start/)
- [@fluenti/react API](/api/react/)
