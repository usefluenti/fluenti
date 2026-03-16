import {
  memo,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { I18nContext } from '../context'
import { hashMessage, extractMessage, reconstruct } from './trans-core'

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
 * `<Trans>` component for rich-text translations containing nested React elements.
 *
 * @example
 * ```tsx
 * <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
 * ```
 */
export const Trans = memo(function Trans({ children, id, render }: TransProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Trans> must be used within an <I18nProvider>')
  }

  const { message, components } = useMemo(
    () => extractMessage(children),
    [children],
  )
  const messageId = useMemo(
    () => id ?? hashMessage(message),
    [id, message],
  )

  // Look up translation; fall back to source message
  const translated = ctx.i18n.t(
    { id: messageId, message },
  )

  const result = reconstruct(translated, components)
  return render ? render(result) : <>{result}</>
})
