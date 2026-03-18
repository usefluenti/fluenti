import { memo, useContext, type ReactNode } from 'react'
import { hashMessage } from '@fluenti/core'
import { I18nContext } from '../context'
import { PLURAL_CATEGORIES, type PluralCategory } from './plural-core'
import { buildICUPluralMessage, renderRichTranslation, serializeRichForms } from './icu-rich'

export interface PluralProps {
  /** The count value */
  value: number
  /** Override the auto-generated synthetic ICU message id */
  id?: string
  /** Message context used for identity and translator disambiguation */
  context?: string
  /** Translator-facing note preserved in extraction catalogs */
  comment?: string
  /** Text for zero (if language supports) */
  zero?: ReactNode
  /** Singular form. `#` replaced with value */
  one?: ReactNode
  /** Dual form (Arabic, etc.) */
  two?: ReactNode
  /** Few form (Slavic languages, etc.) */
  few?: ReactNode
  /** Many form */
  many?: ReactNode
  /** Default plural form */
  other: ReactNode
  /** Offset from value before selecting form */
  offset?: number
}

/**
 * `<Plural>` — ICU plural handling as a component.
 *
 * @example
 * ```tsx
 * <Plural value={count} zero="No messages" one="# message" other="# messages" />
 * ```
 */
export const Plural = memo(function Plural({
  value,
  id,
  context,
  comment,
  zero,
  one,
  two,
  few,
  many,
  other,
  offset,
}: PluralProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Plural> must be used within an <I18nProvider>')
  }

  const forms: Record<PluralCategory, ReactNode | undefined> = {
    zero,
    one,
    two,
    few,
    many,
    other,
  }
  const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, forms)
  const icuMessage = buildICUPluralMessage(
    {
      ...(messages.zero !== undefined && { zero: messages.zero }),
      ...(messages.one !== undefined && { one: messages.one }),
      ...(messages.two !== undefined && { two: messages.two }),
      ...(messages.few !== undefined && { few: messages.few }),
      ...(messages.many !== undefined && { many: messages.many }),
      other: messages.other ?? '',
    },
    offset,
  )

  const descriptor = {
    id: id ?? (context === undefined ? icuMessage : hashMessage(icuMessage, context)),
    message: icuMessage,
    ...(context !== undefined ? { context } : {}),
    ...(comment !== undefined ? { comment } : {}),
  }

  return <>{renderRichTranslation(descriptor, { count: value }, (desc, values) => ctx.i18n.t(desc, values), components)}</>
})
