# TanStack Start Playground

A TanStack Start application with file-based routing and SSR support.

## Running

```bash
# From monorepo root
pnpm playground:tanstack-start

# Or directly
cd examples/tanstack-start
pnpm dev
```

Dev server starts at `http://localhost:5177`.

## Features Demonstrated

- File-based routing with `createFileRoute()` and `createRootRoute()`
- Compile-time `` t`...` `` tagged template translations
- SSR with cookie-based locale detection
- RTL direction support via `getDirection()`
- Client-side navigation with TanStack Router `Link`

## Related Docs

- [TanStack Start Guide](/frameworks/react/tanstack-start/)
- [Quick Start](/start/quick-start/)
- [@fluenti/react API](/api/react/)
