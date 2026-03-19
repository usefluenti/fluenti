# Nuxt 3 Playground

A Nuxt 3 SSR application with cookie-based locale detection.

## Running

```bash
# From monorepo root
pnpm playground:nuxt

# Or directly
cd examples/nuxt
pnpm dev
```

Dev server starts at `http://localhost:5179`.

## Features Demonstrated

- Nuxt module integration via `nuxt.config.ts`
- SSR with cookie-based locale detection
- `v-t` compile-time directive
- `<Trans>`, `<Plural>`, `<Select>` components
- Auto-imported `useI18n()` composable
- SSG and ISR support

## Related Docs

- [Nuxt Setup & Routing](/frameworks/nuxt/setup-and-routing/)
- [Nuxt SSR/SSG/ISR](/frameworks/nuxt/ssr-ssg-isr/)
- [Nuxt Locale Detection](/frameworks/nuxt/locale-detection/)
