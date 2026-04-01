import type { Component, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { hashMessage } from '@fluenti/core/runtime'
import { useI18n } from './use-i18n'
import { resolveCompiledMessageId } from './plain-runtime'
import { reconstruct } from './rich-dom'

export interface FluentiCompiledTransProps {
  message: string
  components?: JSX.Element[]
  id?: string
  context?: string
  comment?: string
  tag?: string
}

export interface FluentiCompiledPluralProps {
  value: number
  message: string
  id?: string
  context?: string
  comment?: string
  tag?: string
}

export interface FluentiCompiledSelectProps {
  value: string
  message: string
  valueMap?: Record<string, string>
  id?: string
  context?: string
  comment?: string
  tag?: string
}

export interface FluentiCompiledRichPluralProps extends FluentiCompiledPluralProps {
  components: JSX.Element[]
}

export interface FluentiCompiledRichSelectProps extends FluentiCompiledSelectProps {
  components: JSX.Element[]
}

/** @internal Build-plugin fast path for compiled `<Trans>` usage. */
export const __FluentiCompiledTrans: Component<FluentiCompiledTransProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const translated = t({
      id: props.id ?? hashMessage(props.message, props.context),
      message: props.message,
      ...(props.context !== undefined ? { context: props.context } : {}),
      ...(props.comment !== undefined ? { comment: props.comment } : {}),
    })
    const result = props.components && props.components.length > 0
      ? reconstruct(translated, props.components as unknown as Node[])
      : translated

    if (props.tag) {
      return (<Dynamic component={props.tag}>{result}</Dynamic>) as JSX.Element
    }
    return (<>{result}</>) as unknown as JSX.Element
  }) as unknown as JSX.Element
}

/** @internal Build-plugin fast path for plain-text `<Plural>` usage. */
export const __FluentiCompiledPlural: Component<FluentiCompiledPluralProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const translated = t(
      {
        id: resolveCompiledMessageId(props.id, props.message, props.context),
        message: props.message,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { count: props.value },
    )

    if (props.tag) {
      return (<Dynamic component={props.tag}>{translated}</Dynamic>) as JSX.Element
    }
    return (<>{translated}</>) as JSX.Element
  }) as unknown as JSX.Element
}

/** @internal Build-plugin fast path for plain-text `<Select>` usage. */
export const __FluentiCompiledSelect: Component<FluentiCompiledSelectProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const translated = t(
      {
        id: resolveCompiledMessageId(props.id, props.message, props.context),
        message: props.message,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { value: props.valueMap?.[props.value] ?? 'other' },
    )

    if (props.tag) {
      return (<Dynamic component={props.tag}>{translated}</Dynamic>) as JSX.Element
    }
    return (<>{translated}</>) as JSX.Element
  }) as unknown as JSX.Element
}

/** @internal Build-plugin fast path for rich-text `<Plural>` usage. */
export const __FluentiCompiledRichPlural: Component<FluentiCompiledRichPluralProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const translated = t(
      {
        id: resolveCompiledMessageId(props.id, props.message, props.context),
        message: props.message,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { count: props.value },
    )
    const result = props.components.length > 0
      ? reconstruct(translated, props.components as unknown as Node[])
      : translated

    if (props.tag) {
      return (<Dynamic component={props.tag}>{result}</Dynamic>) as JSX.Element
    }
    return (<>{result}</>) as JSX.Element
  }) as unknown as JSX.Element
}

/** @internal Build-plugin fast path for rich-text `<Select>` usage. */
export const __FluentiCompiledRichSelect: Component<FluentiCompiledRichSelectProps> = (props) => {
  const { t } = useI18n()

  return (() => {
    const translated = t(
      {
        id: resolveCompiledMessageId(props.id, props.message, props.context),
        message: props.message,
        ...(props.context !== undefined ? { context: props.context } : {}),
        ...(props.comment !== undefined ? { comment: props.comment } : {}),
      },
      { value: props.valueMap?.[props.value] ?? 'other' },
    )
    const result = props.components.length > 0
      ? reconstruct(translated, props.components as unknown as Node[])
      : translated

    if (props.tag) {
      return (<Dynamic component={props.tag}>{result}</Dynamic>) as JSX.Element
    }
    return (<>{result}</>) as JSX.Element
  }) as unknown as JSX.Element
}
