# Solid Multi-Instance Fix: Prevent Silent Global Singleton Overwrite

**Date**: 2026-03-22
**Status**: Approved
**Scope**: `packages/solid`, `packages/core` (tests only)

## Problem

In `@fluenti/solid`, calling `createFluenti()` multiple times silently overwrites the module-level `globalCtx` singleton in `createFluenti()`. Components using `useI18n()` that fall back to the global singleton will silently bind to the wrong instance with no error or warning.

Additionally, `setGlobalI18nContext()` (an `@internal` export) also overwrites `globalCtx` unconditionally.

## Solution

Make `createFluenti()` throw when called a second time in non-HMR environments. HMR environments get a clean replacement with a console warning. Apply the same guard to `setGlobalI18nContext()`.

### Fix: `packages/solid/src/context.ts`

**`createFluenti()`**:

```
if globalCtx already exists:
  if HMR detected (__DEV_HMR__ flag or import.meta.hot):
    warn "[fluenti] HMR: replacing global i18n instance"
    proceed (replace globalCtx)
  else:
    throw Error("[fluenti] createFluenti() has already been called. Use <I18nProvider> for multiple i18n instances.")
```

**`setGlobalI18nContext()`**: Apply the same guard — throw if `globalCtx` already exists (no HMR bypass needed since this is internal-only).

**HMR detection**: Use a helper function `isHMR()` that checks for `import.meta.hot` existence. Note: Vitest also sets `import.meta.hot` to truthy, so tests must stub it to `undefined` via `vi.stubGlobal` or equivalent when testing the throw path.

SSR behavior unchanged: warn + skip global assignment.

`resetGlobalI18nContext()` clears `globalCtx`, allowing a fresh `createFluenti()` call (for testing and HMR).

## Test Plan

All new test files must include `afterEach(() => resetGlobalI18nContext())` for cleanup.

### Layer 1: Solid Unit Tests

**New file**: `packages/solid/tests/multi-instance.test.tsx`

| # | Test | Assertion |
|---|------|-----------|
| 1 | `createFluenti()` called twice throws (stub `import.meta.hot` to undefined) | Error message contains "already been called" |
| 2 | After `resetGlobalI18nContext()`, `createFluenti()` succeeds | No throw |
| 3 | Two sibling `<I18nProvider>` render different locales | en provider renders "Hello", ja provider renders "こんにちは" |
| 4 | Nested providers: inner overrides outer per-subtree | Inner child gets inner locale, outer child gets outer locale |
| 5 | Provider takes priority over globalCtx | Component inside Provider ignores global singleton |
| 6 | Sibling providers with independent `setLocale` | Changing locale in one provider does not affect the other |
| 7 | `setGlobalI18nContext()` called twice throws | Error message contains "already been called" |

### Layer 2: Core Scope Transform Tests

**Append to**: `packages/core/tests/scope-transform.test.ts`

These tests verify that the compile-time `t`` ` transform correctly preserves binding names in multi-instance scenarios. Without correct binding preservation, runtime multi-instance isolation would be broken regardless of the Provider pattern.

| # | Test | Assertion |
|---|------|-----------|
| 8 | Multiple `useI18n()` destructured as `t1`/`t2` | Output contains `t1({` and `t2({` (binding names preserved) |
| 9 | `import { t }` in separate functions | Each function gets its own helper via `useI18n()` |
| 10 | Shadowed `t` in nested scope | Inner `t` not transformed, outer `t` still transformed |

### Layer 3: Integration Tests

**New file**: `packages/solid/tests/integration-multi-instance.test.tsx`

Full render tests using `@solidjs/testing-library` to verify multi-provider isolation in realistic component trees.

| # | Test | Assertion |
|---|------|-----------|
| 11 | Full render: two providers (en + ja) on same page | Each subtree shows correct translations |
| 12 | Locale switch in one provider doesn't affect other | After setLocale('fr') in provider A, provider B still shows ja |
| 13 | Dynamic message loading isolated per provider | `loadMessages` in one provider doesn't leak to another |

## Files Changed

| File | Change |
|------|--------|
| `packages/solid/src/context.ts` | Add duplicate-call guard to `createFluenti()` and `setGlobalI18nContext()` |
| `packages/solid/tests/multi-instance.test.tsx` | New: unit tests for multi-instance guard + Provider isolation |
| `packages/solid/tests/integration-multi-instance.test.tsx` | New: integration tests for multi-provider rendering |
| `packages/core/tests/scope-transform.test.ts` | Append: multi-binding transform tests |

## Out of Scope

- Vue multi-instance (already fully supported, no changes needed)
- React multi-instance (uses Provider pattern, no global singleton)
- Removing `globalCtx` entirely (breaking change, deferred)
