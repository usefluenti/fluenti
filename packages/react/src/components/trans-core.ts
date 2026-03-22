import {
  Children,
  isValidElement,
  cloneElement,
  createElement,
  Fragment,
  type ReactNode,
  type ReactElement,
} from 'react'
import { hashMessage, offsetIndices } from '@fluenti/core'

export { hashMessage }

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
export function extractMessage(children: ReactNode): {
  message: string
  components: ReactElement[]
} {
  const components: ReactElement[] = []
  let message = ''

  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      message += String(child)
    } else if (isValidElement(child)) {
      if (child.type === Fragment) {
        const inner = extractMessage((child.props as { children?: ReactNode }).children)
        message += offsetIndices(inner.message, components.length)
        components.push(...inner.components)
        return
      }

      const idx = components.length
      const inner = extractMessage((child.props as { children?: ReactNode }).children)
      components.push(child)
      components.push(...inner.components)
      if (inner.message === '' && inner.components.length === 0) {
        message += `<${idx}/>`
      } else {
        message += `<${idx}>${offsetIndices(inner.message, idx + 1)}</${idx}>`
      }
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
export function reconstruct(
  translated: string,
  components: ReactElement[],
): ReactNode {
  const COMBINED_RE = /<(\d+)(?:\/>|(>)([\s\S]*?)<\/\1>)/g
  const result: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  COMBINED_RE.lastIndex = 0
  match = COMBINED_RE.exec(translated)

  while (match !== null) {
    if (match.index > lastIndex) {
      result.push(translated.slice(lastIndex, match.index))
    }

    const idx = Number(match[1])
    const isSelfClosing = match[2] === undefined
    const innerText = match[3] ?? ''
    const component = components[idx]

    if (component) {
      if (isSelfClosing) {
        result.push(cloneElement(component, { key: `trans-${idx}` }))
      } else {
        const innerContent = reconstruct(innerText, components)
        result.push(
          cloneElement(component, { key: `trans-${idx}` }, innerContent),
        )
      }
    } else {
      result.push(innerText)
    }

    lastIndex = COMBINED_RE.lastIndex
    match = COMBINED_RE.exec(translated)
  }

  if (lastIndex < translated.length) {
    result.push(translated.slice(lastIndex))
  }

  return result.length === 1 ? result[0]! : createElement(Fragment, null, ...result)
}
