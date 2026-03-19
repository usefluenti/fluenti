# Next.js App Router Playground

A Next.js 15 application with App Router, React Server Components, streaming, and server actions.

## Running

```bash
# From monorepo root
pnpm playground:nextjs

# Or directly
cd examples/nextjs
pnpm dev
```

Dev server starts at `http://localhost:5178`.

## Features Demonstrated

- React Server Components with `createServerI18n`
- Server-side `<Trans>`, `<Plural>`, `<Select>`, `<DateTime>`, `<NumberFormat>`
- Client components with `I18nProvider` and `useI18n()`
- Compile-time `` t`...` `` via `@fluenti/next` webpack loader
- Cookie-based locale detection with `resolveLocale`
- Streaming SSR and server actions

## Related Docs

- [Next.js Guide](/frameworks/react/nextjs/)
- [Server Components Deep Dive](/frameworks/react/server-components/)
- [@fluenti/next API](/api/next/)
