import { useContext, type ReactNode } from 'react'
import { hashMessage } from '@fluenti/core'
import { I18nContext } from '../context'
import { buildICUSelectMessage, normalizeSelectForms, renderRichTranslation, serializeRichForms } from './icu-rich'

export interface SelectProps {
  /** The selector value */
  value: string
  /** Override the auto-generated synthetic ICU message id */
  id?: string
  /** Message context used for identity and translator disambiguation */
  context?: string
  /** Translator-facing note preserved in extraction catalogs */
  comment?: string
  /** Default case */
  other: ReactNode
  /** Type-safe named options. Takes precedence over direct case props. */
  options?: Record<string, ReactNode>
  /** Named cases — any string key maps to a ReactNode */
  [key: string]: ReactNode | Record<string, ReactNode> | undefined
}

/**
 * `<Select>` — ICU select for gender, role, or other categorical values.
 *
 * @example
 * ```tsx
 * <Select
 *   value={gender}
 *   male="He liked your post"
 *   female="She liked your post"
 *   other="They liked your post"
 * />
 * ```
 */
export function Select(props: SelectProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Select> must be used within an <I18nProvider>')
  }

  const { value, id, context, comment, other, options, ...cases } = props
  const forms: Record<string, ReactNode | undefined> = options === undefined
    ? {
      ...Object.fromEntries(
        Object.entries(cases).filter(([key]) => !['value', 'id', 'context', 'comment', 'options', 'other'].includes(key)),
      ),
      other,
    }
    : {
      ...options,
      other,
    }

  const orderedKeys = [...Object.keys(forms).filter(key => key !== 'other'), 'other'] as const
  const { messages, components } = serializeRichForms(orderedKeys, forms)
  const normalized = normalizeSelectForms(
    Object.fromEntries(
      [...orderedKeys].map((key) => [key, messages[key] ?? '']),
    ),
  )
  const icuMessage = buildICUSelectMessage(normalized.forms)

  const descriptor = {
    id: id ?? (context === undefined ? icuMessage : hashMessage(icuMessage, context)),
    message: icuMessage,
    ...(context !== undefined ? { context } : {}),
    ...(comment !== undefined ? { comment } : {}),
  }

  return <>{renderRichTranslation(
    descriptor,
    { value: normalized.valueMap[value] ?? 'other' },
    (desc, values) => ctx.i18n.t(desc, values),
    components,
  )}</>
}
