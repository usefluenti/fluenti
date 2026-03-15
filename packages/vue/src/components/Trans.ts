import { defineComponent, h, type VNode } from 'vue'
import { useI18n } from '../use-i18n'

/** @internal Tree-shakeable dev-mode flag. Bundlers replace or dead-code-eliminate this. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const __DEV__: boolean = /* @__PURE__ */ (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (globalThis as Record<string, unknown>)['process'] !== undefined
      ? ((globalThis as Record<string, unknown>)['process'] as { env: Record<string, string | undefined> }).env['NODE_ENV'] !== 'production'
      : true
  } catch {
    return true
  }
})()

/**
 * Regex matching `<tagName>content</tagName>` patterns in a translated message.
 * Used to split rich text into plain text segments and named slot invocations.
 */
const TAG_RE = /<(\w+)>([\s\S]*?)<\/\1>/g

/**
 * Parse a message string into an array of segments.
 * Plain text becomes `{ type: 'text', value }`.
 * Tag pairs become `{ type: 'tag', name, children }`.
 * @internal
 */
interface TextSegment {
  type: 'text'
  value: string
}

interface TagSegment {
  type: 'tag'
  name: string
  children: string
}

type Segment = TextSegment | TagSegment

function parseMessage(message: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0

  TAG_RE.lastIndex = 0
  let match = TAG_RE.exec(message)

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: message.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'tag', name: match[1]!, children: match[2]! })
    lastIndex = TAG_RE.lastIndex
    match = TAG_RE.exec(message)
  }

  if (lastIndex < message.length) {
    segments.push({ type: 'text', value: message.slice(lastIndex) })
  }

  return segments
}

/**
 * `<Trans>` component for rich text with Vue components.
 *
 * Recommended usage — default slot with inline HTML / components:
 *
 * @example
 * ```vue
 * <Trans>
 *   Visit our <a href="/docs">documentation</a> to learn more.
 * </Trans>
 * ```
 *
 * @example
 * ```vue
 * <Trans>
 *   Click <RouterLink to="/next">here</RouterLink> to continue.
 * </Trans>
 * ```
 *
 * @deprecated message prop — use the default slot instead:
 * ```vue
 * <!-- Before (deprecated) -->
 * <Trans message="Click <link>here</link> to continue">
 *   <template #link="{ children }">
 *     <a href="/next">{{ children }}</a>
 *   </template>
 * </Trans>
 *
 * <!-- After (recommended) -->
 * <Trans>
 *   Click <a href="/next">here</a> to continue.
 * </Trans>
 * ```
 */
export const Trans = defineComponent({
  name: 'Trans',
  props: {
    /**
     * The translated message string, may contain `<tag>content</tag>` patterns.
     * @deprecated Use the default slot instead for a simpler and more idiomatic API.
     */
    message: { type: String, required: false, default: undefined },
    /** Optional interpolation values applied before tag parsing */
    values: { type: Object, default: () => ({}) },
    /** Wrapper element tag name (default: `span`) */
    tag: { type: String, default: 'span' },
  },
  setup(props, { slots }) {
    const { format } = useI18n()

    let warned = false

    return () => {
      // No message → render default slot content directly
      if (!props.message) {
        const defaultSlot = slots['default']?.()
        if (!defaultSlot) return null
        return defaultSlot.length === 1 ? defaultSlot[0]! : h(props.tag, null, defaultSlot)
      }

      if (__DEV__ && !warned) {
        warned = true
        console.warn(
          '[fluenti] <Trans> "message" prop is deprecated. ' +
            'Use the default slot instead for a simpler API. ' +
            'See https://fluenti.dev/guide/migration#trans-default-slot',
        )
      }

      const interpolated = format(
        props.message,
        props.values as Record<string, unknown>,
      )
      const segments = parseMessage(interpolated)

      const children: Array<VNode | string> = segments.map((seg) => {
        if (seg.type === 'text') {
          return seg.value
        }

        const slotFn = slots[seg.name]
        if (slotFn) {
          return slotFn({ children: seg.children }) as unknown as VNode
        }

        // No matching slot — render the tag content as plain text
        return seg.children
      })

      return h(props.tag, null, children)
    }
  },
})
