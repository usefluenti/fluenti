import type { FluentiPlugin, PluginCompileContext } from '../types'
import { parse, FluentParseError } from '../parser'

/** Validation issue found in a message */
export interface ValidationIssue {
  readonly id: string
  readonly locale: string
  readonly message: string
  readonly error: string
}

/**
 * Extract variable names from an ICU message by parsing it.
 * Returns a sorted list of unique variable names.
 */
function extractVariableNames(message: string): string[] {
  try {
    const ast = parse(message)
    const names = new Set<string>()
    collectNames(ast, names)
    return [...names].sort()
  } catch {
    return []
  }
}

function collectNames(
  nodes: Array<{ type: string; name?: string; variable?: string; options?: Record<string, unknown[]> }>,
  names: Set<string>,
): void {
  for (const node of nodes) {
    if (node.type === 'variable' && node.name && node.name !== '#') {
      names.add(node.name)
    }
    if (node.type === 'function' && node.variable) {
      names.add(node.variable)
    }
    if ((node.type === 'plural' || node.type === 'select') && node.variable) {
      names.add(node.variable)
      if (node.options) {
        for (const branch of Object.values(node.options)) {
          collectNames(branch as typeof nodes, names)
        }
      }
    }
  }
}

/**
 * Creates a plugin that validates ICU message syntax in catalogs.
 *
 * Checks performed:
 * - All messages parse as valid ICU MessageFormat
 * - Placeholder variables are consistent across locales
 *
 * Issues are logged as warnings — they do not block compilation.
 *
 * @example
 * ```ts
 * import { messageValidatorPlugin } from '@fluenti/core'
 *
 * export default defineConfig({
 *   plugins: [messageValidatorPlugin()],
 * })
 * ```
 */
export function messageValidatorPlugin(): FluentiPlugin {
  /** Tracks source locale variables per message ID for cross-locale checks */
  const sourceVariables = new Map<string, string[]>()

  return {
    name: 'fluenti:message-validator',

    onBeforeCompile(context: PluginCompileContext): void {
      const issues: ValidationIssue[] = []
      const msgs: Record<string, string> = context.messages as Record<string, string>

      for (const [id, message] of Object.entries(msgs)) {
        // 1. Check ICU parse validity
        try {
          parse(message)
        } catch (error) {
          const errorMsg = error instanceof FluentParseError
            ? error.message
            : String(error)
          issues.push({
            id,
            locale: context.locale,
            message,
            error: `Invalid ICU syntax: ${errorMsg}`,
          })
          continue
        }

        // 2. Check placeholder consistency
        const vars = extractVariableNames(message)
        const existing = sourceVariables.get(id)

        if (!existing) {
          // First locale seen for this ID — record as reference
          sourceVariables.set(id, vars)
        } else {
          // Compare with reference locale
          const missingVars = existing.filter((v) => !vars.includes(v))
          const extraVars = vars.filter((v) => !existing.includes(v))

          if (missingVars.length > 0) {
            issues.push({
              id,
              locale: context.locale,
              message,
              error: `Missing placeholders: ${missingVars.map((v) => `{${v}}`).join(', ')}`,
            })
          }
          if (extraVars.length > 0) {
            issues.push({
              id,
              locale: context.locale,
              message,
              error: `Extra placeholders: ${extraVars.map((v) => `{${v}}`).join(', ')}`,
            })
          }
        }
      }

      for (const issue of issues) {
        console.warn(
          `[fluenti:message-validator] ${issue.locale}/${issue.id}: ${issue.error}`,
        )
      }
    },
  }
}
