# Runtime Slim-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce total runtime bundle (core + framework) from ~9 KB to < 3 KB gzip, beating Lingui's ~3.3 KB

**Architecture:** Split @fluenti/core into 4 subpath entries — minimal runtime, SSR, formatters, internal (parser/compiler). Remove components from framework main entries into `/components` subpath. Eliminate ICU parser from runtime `t()` path.

**Tech Stack:** TypeScript, tsup/Vite, Vitest

**Baseline sizes (gzip):** core=6069B, react=3067B, vue=3888B, solid=3850B

---

### Task 1: Create core subpath entries (ssr, formatters)

**Files:**
- Create: `packages/core/src/ssr-entry.ts`
- Create: `packages/core/src/formatters-entry.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/package.json`
- Modify: `packages/core/vite.config.ts`

### Task 2: Slim down core index.ts — remove parser/compiler/interpolate/SSR/formatters/diagnostics

**Files:**
- Modify: `packages/core/src/index.ts`

### Task 3: Rewrite createFluentiCore to not depend on parser/interpolate

**Files:**
- Modify: `packages/core/src/index.ts`

### Task 4: Create React /components subpath

**Files:**
- Create: `packages/react/src/components-entry.ts`
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/package.json`
- Modify: `packages/react/vite.config.ts`

### Task 5: Create Vue /components subpath

**Files:**
- Create: `packages/vue/src/components-entry.ts`
- Modify: `packages/vue/src/index.ts`
- Modify: `packages/vue/package.json`
- Modify: `packages/vue/vite.config.ts`

### Task 6: Create Solid /components subpath

**Files:**
- Create: `packages/solid/src/components-entry.ts`
- Modify: `packages/solid/src/index.ts`
- Modify: `packages/solid/package.json`
- Modify: `packages/solid/vite.config.ts`

### Task 7: Update internal imports across all packages

**Files:**
- Modify: All files that import parser/SSR/formatters from `@fluenti/core`

### Task 8: Fix tests and verify bundle sizes

### Task 9: Update examples to use new import paths
