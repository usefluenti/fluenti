import { createElement, memo, useContext } from 'react'
import { I18nContext } from '../context'
import { renderRichTranslation } from './icu-rich'
import { resolveCompiledMessageId } from './plain'

export interface FluentiCompiledPluralProps {
  value: number
  message: string
  id?: string
  context?: string
  comment?: string
}

export interface FluentiCompiledSelectProps {
  value: string
  message: string
  valueMap?: Record<string, string>
  id?: string
  context?: string
  comment?: string
  tag?: keyof React.JSX.IntrinsicElements
}

export interface FluentiCompiledRichPluralProps extends FluentiCompiledPluralProps {
  components: React.ReactElement[]
}

export interface FluentiCompiledRichSelectProps extends FluentiCompiledSelectProps {
  components: React.ReactElement[]
}

/** @internal Build-plugin fast path for plain-text `<Plural>` usage. */
export const __FluentiCompiledPlural = /* @__PURE__ */ memo(function FluentiCompiledPlural({
  value,
  message,
  id,
  context,
  comment,
}: FluentiCompiledPluralProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Plural> must be used within an <I18nProvider>')
  }

  const translated = ctx.t(
    {
      id: resolveCompiledMessageId(id, message, context),
      message,
      ...(context !== undefined ? { context } : {}),
      ...(comment !== undefined ? { comment } : {}),
    },
    { count: value },
  )

  return <>{translated}</>
})

/** @internal Build-plugin fast path for plain-text `<Select>` usage. */
export const __FluentiCompiledSelect = /* @__PURE__ */ memo(function FluentiCompiledSelect({
  value,
  message,
  valueMap,
  id,
  context,
  comment,
  tag,
}: FluentiCompiledSelectProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Select> must be used within an <I18nProvider>')
  }

  const translated = ctx.t(
    {
      id: resolveCompiledMessageId(id, message, context),
      message,
      ...(context !== undefined ? { context } : {}),
      ...(comment !== undefined ? { comment } : {}),
    },
    { value: valueMap?.[value] ?? 'other' },
  )

  return tag ? createElement(tag, null, translated) : <>{translated}</>
})

/** @internal Build-plugin fast path for rich-text `<Plural>` usage. */
export const __FluentiCompiledRichPlural = /* @__PURE__ */ memo(function FluentiCompiledRichPlural({
  value,
  message,
  components,
  id,
  context,
  comment,
}: FluentiCompiledRichPluralProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Plural> must be used within an <I18nProvider>')
  }

  const descriptor = {
    id: resolveCompiledMessageId(id, message, context),
    message,
    ...(context !== undefined ? { context } : {}),
    ...(comment !== undefined ? { comment } : {}),
  }

  return <>{renderRichTranslation(descriptor, { count: value }, (desc, values) => ctx.t(desc, values), components)}</>
})

/** @internal Build-plugin fast path for rich-text `<Select>` usage. */
export const __FluentiCompiledRichSelect = /* @__PURE__ */ memo(function FluentiCompiledRichSelect({
  value,
  message,
  valueMap,
  components,
  id,
  context,
  comment,
  tag,
}: FluentiCompiledRichSelectProps) {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('[fluenti] <Select> must be used within an <I18nProvider>')
  }

  const descriptor = {
    id: resolveCompiledMessageId(id, message, context),
    message,
    ...(context !== undefined ? { context } : {}),
    ...(comment !== undefined ? { comment } : {}),
  }
  const translated = renderRichTranslation(
    descriptor,
    { value: valueMap?.[value] ?? 'other' },
    (desc, values) => ctx.t(desc, values),
    components,
  )

  return tag ? createElement(tag, null, translated) : <>{translated}</>
})
