# Solid Multi-Instance Fix: Prevent Silent Global Singleton Overwrite

**Date**: 2026-03-22
**Status**: Approved
**Scope**: `packages/solid`, `packages/core` (tests only)

## Problem

In `@fluenti/solid`, calling `createFluenti()` multiple times silently overwrites the module-level `globalCtx` singleton (`context.ts:374`). Components using `useI18n()` that fall back to the global singleton will silently bind to the wrong instance with no error or warning.

## Solution

Make `createFluenti()` throw when called a second time in non-HMR environments. HMR environments get a clean replacement with a console warning.

### Fix: `packages/solid/src/context.ts`

Modify `createFluenti()`:

```
if globalCtx already exists:
  if HMR detected (import.meta.hot):
    warn "[fluenti] HMR: replacing global i18n instance"
    proceed (replace globalCtx)
  else:
    throw Error("[fluenti] createFluenti() has already been called. Use <I18nProvider> for multiple i18n instances.")
```

HMR detection: check `import.meta.hot` (Vite) existence. This covers the primary dev server used by the project.

SSR behavior unchanged: warn + skip global assignment.

`resetGlobalI18nContext()` clears `globalCtx`, allowing a fresh `createFluenti()` call (for testing).

## Test Plan

### Layer 1: Solid Unit Tests

**New file**: `packages/solid/tests/multi-instance.test.tsx`

| # | Test | Assertion |
|---|------|-----------|
| 1 | `createFluenti()` called twice throws | Error message contains "already been called" |
| 2 | After `resetGlobalI18nContext()`, `createFluenti()` succeeds | No throw |
| 3 | Two sibling `<I18nProvider>` render different locales | en provider renders "Hello", ja provider renders "こんにちは" |
| 4 | Nested providers: inner overrides outer per-subtree | Inner child gets inner locale, outer child gets outer locale |
| 5 | Provider takes priority over globalCtx | Component inside Provider ignores global singleton |
| 6 | Sibling providers with independent `setLocale` | Changing locale in one provider does not affect the other |

### Layer 2: Core Scope Transform Tests

**Append to**: `packages/core/tests/scope-transform.test.ts`

| # | Test | Assertion |
|---|------|-----------|
| 7 | Multiple `useI18n()` destructured as `t1`/`t2` | Output contains `t1({` and `t2({` (binding names preserved) |
| 8 | `import { t }` in separate functions | Each function gets its own `__fluenti_t` helper |
| 9 | Shadowed `t` in nested scope | Inner `t` not transformed, outer `t` still transformed |

### Layer 3: E2E Integration Test

**New file**: `packages/solid/tests/e2e-multi-instance.test.tsx`

| # | Test | Assertion |
|---|------|-----------|
| 10 | Full render: two providers (en + ja) on same page | Each subtree shows correct translations |
| 11 | Locale switch in one provider doesn't affect other | After setLocale('fr') in provider A, provider B still shows ja |
| 12 | Dynamic message loading isolated per provider | `loadMessages` in one provider doesn't leak to another |

## Files Changed

| File | Change |
|------|--------|
| `packages/solid/src/context.ts` | Add duplicate-call guard to `createFluenti()` |
| `packages/solid/tests/multi-instance.test.tsx` | New: unit tests for multi-instance scenarios |
| `packages/solid/tests/e2e-multi-instance.test.tsx` | New: E2E integration tests |
| `packages/core/tests/scope-transform.test.ts` | Append: multi-binding transform tests |

## Out of Scope

- Vue multi-instance (already fully supported, no changes needed)
- React multi-instance (uses Provider pattern, no global singleton)
- Removing `globalCtx` entirely (breaking change, deferred)
