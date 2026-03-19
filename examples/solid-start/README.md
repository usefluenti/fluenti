# SolidStart Playground

A SolidStart SSR application with hydration and server-side i18n.

## Running

```bash
# From monorepo root
pnpm playground:solid-start

# Or directly
cd examples/solid-start
pnpm dev
```

Dev server starts at `http://localhost:5180`.

## Features Demonstrated

- SolidStart SSR with `createServerI18n`
- Server-side locale detection via `getRequestEvent()`
- Client-side hydration with `I18nProvider`
- Compile-time `` t`...` `` tagged template translations
- `<Trans>`, `<Plural>`, `<Select>` components

## Related Docs

- [SolidStart Guide](/frameworks/solid/solidstart/)
- [Solid SSR Guide](/frameworks/solid/ssr/)
- [@fluenti/solid API](/api/solid/)
