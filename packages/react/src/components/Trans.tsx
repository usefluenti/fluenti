import {
  useContext,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from 'react'
import { I18nContext } from '../context'

export interface TransProps {
  /** Source text with embedded components */
  children: ReactNode
  /** Override auto-generated hash ID */
  id?: string
  /** Context comment for translators */
  comment?: string
  /** Custom render wrapper */
  render?: (translation: ReactNode) => ReactNode
}

/**
 * FNV-1a hash producing a short alphanumeric ID.
 * @internal
 */
function hashMessage(message: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Extract a message string and component list from React children.
 *
 * Converts:
 *   <Trans>Hello <b>{name}</b>, welcome!</Trans>
 * Into:
 *   message: "Hello <0>{name}</0>, welcome!"
 *   components: [<b>{name}</b>]
 *
 * @internal
 */
function extractMessage(children: ReactNode): {
  message: string
  components: ReactElement[]
} {
  const components: ReactElement[] = []
  let message = ''

  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      message += String(child)
    } else if (isValidElement(child)) {
      const idx = components.length
      components.push(child)
      const inner = extractMessage((child.props as { children?: ReactNode }).children)
      // Merge inner components into the flat list (offset their indices)
      message += `<${idx}>${inner.message}</${idx}>`
    }
  })

  return { message, components }
}

/**
 * Reconstruct a translated message string back into React elements.
 *
 * Parses "<0>content</0>" tags and replaces them with cloned components.
 *
 * @internal
 */
function reconstruct(
  translated: string,
  components: ReactElement[],
): ReactNode {
  const TAG_RE = /<(\d+)>([\s\S]*?)<\/\1>/g
  const result: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  TAG_RE.lastIndex = 0
  match = TAG_RE.exec(translated)

  while (match !== null) {
    if (match.index > lastIndex) {
      result.push(translated.slice(lastIndex, match.index))
    }

    const idx = Number(match[1])
    const innerText = match[2]!
    const component = components[idx]

    if (component) {
      // Recursively reconstruct inner content
      const innerContent = reconstruct(innerText, components)
      result.push(
        cloneElement(component, { key: `trans-${idx}` }, innerContent),
      )
    } else {
      result.push(innerText)
    }

    lastIndex = TAG_RE.lastIndex
    match = TAG_RE.exec(translated)
  }

  if (lastIndex < translated.length) {
    result.push(translated.slice(lastIndex))
  }

  return result.length === 1 ? result[0]! : <>{result}</>
}

/**
 * `<Trans>` component for rich-text translations containing nested React elements.
 *
 * @example
 * ```tsx
 * <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
 * ```
 */
export function Trans({ children, id, render }: TransProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Trans> must be used within an <I18nProvider>')
  }

  const { message, components } = extractMessage(children)
  const messageId = id ?? hashMessage(message)

  // Look up translation; fall back to source message
  const translated = ctx.i18n.t(
    { id: messageId, message },
  )

  const result = reconstruct(translated, components)
  return render ? render(result) : <>{result}</>
}
