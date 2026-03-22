import {
  createElement,
  memo,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react'
import { I18nContext } from '../context'
import { hashMessage, extractMessage, reconstruct } from './trans-core'

export interface TransProps {
  /** Source text with embedded components */
  children: ReactNode
  /** Override auto-generated hash ID */
  id?: string
  /** Message context used for identity and translator disambiguation */
  context?: string
  /** Context comment for translators */
  comment?: string
  /** Wrapper element tag name (e.g. 'span', 'div'). Defaults to Fragment (no wrapper). */
  tag?: keyof React.JSX.IntrinsicElements
  /** Custom render wrapper */
  render?: (translation: ReactNode) => ReactNode
  /** @internal Pre-computed message ID from build plugin */
  __id?: string
  /** @internal Pre-computed ICU message from build plugin */
  __message?: string
  /** @internal Pre-computed component list from build plugin */
  __components?: ReactElement[]
}

/**
 * `<Trans>` component for rich-text translations containing nested React elements.
 *
 * @example
 * ```tsx
 * <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
 * ```
 */
export const Trans = memo(function Trans({
  children,
  id,
  context,
  comment,
  tag,
  render,
  __id,
  __message,
  __components,
}: TransProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Trans> must be used within an <I18nProvider>')
  }

  // Fast path: build plugin pre-computed message and components
  const hasPrecomputed = __message !== undefined

  const { message, components } = useMemo(
    () => hasPrecomputed
      ? { message: __message!, components: __components ?? [] }
      : extractMessage(children),
    [hasPrecomputed, __message, __components, children],
  )
  const messageId = useMemo(
    () => id ?? __id ?? hashMessage(message, context),
    [id, __id, message, context],
  )

  const translated = ctx.t(
    {
      id: messageId,
      message,
      ...(context !== undefined ? { context } : {}),
      ...(comment !== undefined ? { comment } : {}),
    },
  )

  const result = reconstruct(translated, components)
  if (render) return render(result)
  return tag ? createElement(tag, null, result) : <>{result}</>
})
