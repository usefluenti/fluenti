import type {
  FluentiPlugin,
  PluginExtractContext,
  PluginCompileContext,
  CustomFormatter,
} from './types'

export type { FluentiPlugin, PluginExtractContext, PluginCompileContext }

/** Map of message ID to ICU message string */
export type ExtractedMessages = Record<string, string>

// ---- Plugin Runner ----

export interface PluginRunner {
  /** Run all onAfterExtract hooks in order */
  runAfterExtract(context: PluginExtractContext): Promise<void>
  /** Run all onBeforeCompile hooks in order */
  runBeforeCompile(context: PluginCompileContext): Promise<void>
  /** Run all onAfterCompile hooks in order */
  runAfterCompile(context: PluginCompileContext): Promise<void>
  /** Run all transformMessages hooks in order, piping output to next plugin */
  runTransformMessages(messages: ExtractedMessages, locale: string): Promise<ExtractedMessages>
  /** Collect all custom formatters from plugins (later plugins override earlier) */
  collectFormatters(): Record<string, CustomFormatter>
}

/**
 * Create a plugin runner that calls hooks in registration order.
 *
 * - Hooks are awaited sequentially (first registered = first called)
 * - Errors are logged and swallowed — one plugin failing does not break others
 * - Contexts are shallow-frozen before being passed to plugins
 */
export function createPluginRunner(plugins: readonly FluentiPlugin[]): PluginRunner {
  async function runHook(
    hookName: 'onAfterExtract' | 'onBeforeCompile' | 'onAfterCompile',
    context: PluginExtractContext | PluginCompileContext,
  ): Promise<void> {
    const frozen = Object.freeze({ ...context })
    for (const plugin of plugins) {
      const hook = plugin[hookName] as
        | ((ctx: PluginExtractContext | PluginCompileContext) => void | Promise<void>)
        | undefined
      if (!hook) continue
      try {
        await hook(frozen)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[fluenti] Plugin "${plugin.name}" ${hookName} failed: ${message}`)
      }
    }
  }

  return {
    async runAfterExtract(context: PluginExtractContext): Promise<void> {
      await runHook('onAfterExtract', context)
    },

    async runBeforeCompile(context: PluginCompileContext): Promise<void> {
      await runHook('onBeforeCompile', context)
    },

    async runAfterCompile(context: PluginCompileContext): Promise<void> {
      await runHook('onAfterCompile', context)
    },

    async runTransformMessages(
      messages: ExtractedMessages,
      locale: string,
    ): Promise<ExtractedMessages> {
      let current = { ...messages }
      for (const plugin of plugins) {
        if (!plugin.transformMessages) continue
        try {
          const input = Object.freeze({ ...current })
          current = await plugin.transformMessages(input, locale)
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          console.warn(`[fluenti] Plugin "${plugin.name}" transformMessages failed: ${msg}`)
        }
      }
      return current
    },

    collectFormatters(): Record<string, CustomFormatter> {
      const result: Record<string, CustomFormatter> = {}
      for (const plugin of plugins) {
        if (!plugin.formatters) continue
        Object.assign(result, plugin.formatters)
      }
      return result
    },
  }
}
