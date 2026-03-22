/**
 * @fluenti/core/transform — Stable bundler plugin API.
 *
 * Provides the code-transform pipeline, runtime code generation,
 * message-identity utilities, and AST helpers that any bundler
 * plugin (Vite, webpack, Parcel, etc.) needs to integrate Fluenti.
 *
 * This is a **public** subpath with semver guarantees.
 */

// ── Scope Transform ──────────────────────────────────────────────────────────
export { scopeTransform, scopeTransformAst } from './scope-transform'
export type { ScopeTransformOptions, ScopeTransformResult, Replacement } from './scope-types'
export type { ScopeTransformAstResult } from './scope-transform-ast'

// ── Trans Component Transform ────────────────────────────────────────────────
export { transformTransComponents } from './trans-transform'
export type { TransTransformResult } from './trans-transform'

// ── Message Identity ─────────────────────────────────────────────────────────
export {
  canonicalizeMessageIdentity,
  createMessageId,
  resolveDescriptorId,
  isGeneratedMessageId,
} from './identity'

// ── Source AST Analysis ──────────────────────────────────────────────────────
export {
  parseSourceModule,
  walkSourceAst,
  isSourceNode,
} from './source-analysis'
export type {
  SourceNode,
  SourceLocation,
  SourceLocationPoint,
} from './source-analysis'

// ── Runtime Code Generation ──────────────────────────────────────────────────
export { createRuntimeGenerator } from './runtime-template'
export type { RuntimePrimitives, RuntimeGenerator, RuntimeGeneratorOptions } from './runtime-template'

// ── Transform Pipeline ───────────────────────────────────────────────────────

import { transformTransComponents } from './trans-transform'
import type { TransTransformResult } from './trans-transform'
import { scopeTransform } from './scope-transform'
import type { ScopeTransformOptions, ScopeTransformResult } from './scope-types'

export interface TransformPipelineOptions {
  /** Framework identifier (e.g. 'vue', 'solid', 'react', 'svelte') */
  framework: string
  /** Default scope-transform options (merged with per-call overrides) */
  scope?: Omit<ScopeTransformOptions, 'framework'>
}

export interface TransformResult {
  code: string
  transformed: boolean
}

export interface TransformPipeline {
  /** Run the full transform chain: Trans component optimization → scope transform. */
  transform(code: string, fileId: string): TransformResult
  /** Run only the Trans component transform. */
  transformTrans(code: string): TransTransformResult
  /** Run only the scope transform, with optional per-call overrides. */
  transformScope(code: string, overrides?: Partial<ScopeTransformOptions>): ScopeTransformResult
}

/**
 * Quick regex check — avoids full AST parsing on files without Fluenti patterns.
 *
 * Returns `true` when the source *may* contain `t()`, `t\`\``, or
 * `import { t }` from a Fluenti package, meaning the full scope transform
 * should run.  False positives are OK (the real AST pass is authoritative);
 * false negatives are not.
 */
export function hasScopeTransformCandidate(code: string): boolean {
  // t('key') or descriptor-call patterns
  if (/(?<![.\w$])t\(\s*['"]/.test(code) || /[A-Za-z_$][\w$]*\(\s*\{/.test(code)) {
    return true
  }

  // Tagged template with useI18n / getI18n binding in scope
  if (/[A-Za-z_$][\w$]*`/.test(code) && (code.includes('useI18n') || code.includes('getI18n'))) {
    return true
  }

  // Any import from a Fluenti package (covers t, Trans, Plural, Select, etc.)
  if (/import\s*\{[^}]*\}.*from\s*['"]@fluenti\/(react|vue|solid|next)/.test(code)) {
    return true
  }

  return false
}

/**
 * Create a reusable transform pipeline for a given framework.
 *
 * Encapsulates the two-step pattern used by every bundler integration:
 * 1. `<Trans>` component optimization (JSX/TSX only)
 * 2. Scope-aware `t\`\`` / `t()` rewriting
 *
 * ```ts
 * const pipeline = createTransformPipeline({ framework: 'react' })
 * const result = pipeline.transform(source, 'src/App.tsx')
 * ```
 */
export function createTransformPipeline(options: TransformPipelineOptions): TransformPipeline {
  const baseOptions: ScopeTransformOptions = {
    framework: options.framework,
    ...options.scope,
  }

  function pipelineTransformTrans(code: string): TransTransformResult {
    return transformTransComponents(code)
  }

  function pipelineTransformScope(
    code: string,
    overrides?: Partial<ScopeTransformOptions>,
  ): ScopeTransformResult {
    const merged = overrides ? { ...baseOptions, ...overrides } : baseOptions
    return scopeTransform(code, merged)
  }

  function pipelineTransform(code: string, fileId: string): TransformResult {
    let result = code
    let changed = false

    // Step 1: <Trans> compile-time optimization (JSX/TSX only)
    if (/\.[jt]sx(\?|$)/.test(fileId) && /<Trans[\s>]/.test(result)) {
      const transResult = transformTransComponents(result)
      if (transResult.transformed) {
        result = transResult.code
        changed = true
      }
    }

    // Step 2: Scope-aware t`` / t() transform
    if (hasScopeTransformCandidate(result)) {
      const scoped = scopeTransform(result, baseOptions)
      if (scoped.transformed) {
        return { code: scoped.code, transformed: true }
      }
    }

    return { code: result, transformed: changed }
  }

  return {
    transform: pipelineTransform,
    transformTrans: pipelineTransformTrans,
    transformScope: pipelineTransformScope,
  }
}
