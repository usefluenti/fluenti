# Fluenti Security Hardening Design

**Date**: 2026-03-21
**Status**: Approved
**Scope**: Full security audit findings + hardening plan

## Background

A comprehensive security audit of the Fluenti monorepo identified 9 items across code vulnerabilities, CI/CD configuration gaps, and missing security test coverage. No critical exploitable vulnerabilities were found in production, but several defense-in-depth improvements are needed.

## Positive Findings (Already Secure)

- Prototype pollution prevention via `Object.create(null)` + `Object.hasOwn()` with tests
- SSR XSS escaping in `getSSRLocaleScript()` with comprehensive tests
- No `eval()`, `new Function()`, or dynamic code execution
- CLI extractors use AST-based parsing (not regex)
- pnpm lockfile + `--frozen-lockfile` in CI
- NPM publishing uses OIDC authentication
- TypeScript strict mode fully enabled
- Version bump script has input validation + `set -euo pipefail`

## Findings

### P0 — Medium-High Risk

#### 1. Path Injection in Virtual Module Code Generation

**File**: `packages/vite-plugin/src/virtual-modules.ts`
**Lines**: 74, 110, 120, 169

`catalogDir` and locale names are embedded directly into generated JavaScript string literals. A malicious `catalogDir` containing quotes or backticks could break out of the string and inject arbitrary code.

**Note**: `validateLocale()` at `packages/core/src/locale.ts:163` already exists but only checks for non-empty strings — it does not reject metacharacters. The fix should strengthen this existing function.

**Fix**:
- Use `JSON.stringify()` for all string literals in generated code
- Strengthen `validateLocale()` with a BCP 47 format regex (e.g., `/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/`)
- Add whitelist validation for `catalogDir` (alphanumeric + `-_./`)

### P1 — Medium Risk (Defense-in-Depth)

#### 2. RegExp Injection in SFC Transform

**File**: `packages/vite-plugin/src/sfc-transform.ts`
**Lines**: 31, 189, 199, 439, 466, 481, 485

`tagName`, `attrName`, `cat`, and `name` parameters are interpolated directly into `new RegExp()` without escaping regex metacharacters.

**Mitigating factor**: All 7 call sites currently receive inputs that are either (a) constrained to `\w+` by upstream regex captures, (b) hardcoded string constants (`PLURAL_CATEGORIES`), or (c) string literals at call sites (`'id'`, `'context'`). No user-controlled input with metacharacters can reach these sites today. However, this is a fragile invariant that could break with future changes.

**Fix**: Add `escapeRegExp()` utility as defense-in-depth:

```typescript
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

**Note**: Also reviewed `escapeSingleQuotedString()` at line 6-8 — it correctly escapes `\` and `'` for single-quoted JS string contexts, which is adequate for its current usage.

#### 3. SSR Locale String Length Limit

**File**: `packages/core/src/ssr.ts` (lines 112-121)

No maximum length check on locale strings before embedding in SSR script. Extremely long strings could cause memory bloat.

**Fix**: Add `MAX_LOCALE_LENGTH = 128` constant; throw if exceeded.

#### 4. Parser Nesting Depth Limit

**File**: `packages/core/src/parser.ts`

No explicit depth limit on nested `{...}` structures. Deeply nested ICU messages (1000+ levels) could cause stack overflow. The `depth` parameter exists and is passed through recursive calls, but is never checked against a limit.

**Fix**: Add `MAX_NESTING_DEPTH = 20` constant; throw `ParseError` if exceeded at the top of `parseNodes()`.

#### 5. Replace `exec()` with `execFile()`

**File**: `packages/vite-plugin/src/dev-runner.ts` (line 97)

Shell command built via string concatenation passed to `exec()`. While parameters are currently controlled, the `bin` path could contain shell metacharacters if the project lives in a directory with spaces or special characters.

**Fix**: Refactor to use `execFile()` or `spawn()` with array arguments.

### P2 — Low Risk (CI/CD)

#### 6. Explicit CI Permissions

**Files**: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`

Missing explicit `permissions` block. Default is safe for public repos but should be explicit.

**Fix**: Add `permissions: { contents: read }` to both workflows.

#### 7. Dependabot Configuration

No dependency monitoring configured.

**Fix**: Add `.github/dependabot.yml` for weekly npm production dependency scanning.

#### 8. CI Dependency Audit

No `pnpm audit` in CI pipeline.

**Fix**: Add `pnpm audit --prod` step to CI workflow.

### P3 — Security Test Suite

#### 9. Targeted Security Tests

Missing tests for:
- RegExp injection with metacharacters in config values
- Code generation with malicious `catalogDir` / locale names
- Parser with deeply nested input (20+ levels)
- SSR with oversized locale strings

**Fix**: Add security-focused test files alongside existing tests.

## Accepted Risks

- **`globalThis[Symbol.for(...)]` pattern** in `virtual-modules.ts` exposes internal runtime functions (e.g., `__switchLocale`) on the global object. Any code in the same runtime could call these. Low risk — Symbol.for keys are not easily guessable, and locale switching has no destructive side effects.

## Implementation Phases

### Phase 1: Patch Vulnerabilities (P0 + P1)

Fix items #1-#5 with corresponding security tests. Run full test suite to confirm no regressions.

- #1 (P0): `JSON.stringify()` + strengthen `validateLocale()` + `catalogDir` whitelist
- #2 (P1): `escapeRegExp()` defense-in-depth
- #3 (P1): `MAX_LOCALE_LENGTH` check
- #4 (P1): `MAX_NESTING_DEPTH` check
- #5 (P1): `exec()` → `execFile()`/`spawn()`

### Phase 2: CI Hardening (P2)

Items #6-#8. Configuration-only changes, no code logic affected.

### Phase 3: Security Test Suite (P3)

Item #9. Establish regression tests for all hardened code paths.

## Out of Scope (YAGNI)

- Paid security tools (Snyk) — Dependabot + `pnpm audit` sufficient
- SBOM generation — not needed at current scale
- Signed releases — no supply chain attack risk currently
- Parser rewrite — current hand-written parser is secure and efficient
