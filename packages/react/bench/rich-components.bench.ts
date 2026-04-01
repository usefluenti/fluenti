import { bench, describe } from 'vitest'
import { createElement } from 'react'
import { createFluentiCore } from '@fluenti/core'
import {
  buildICUPluralMessage,
  buildICUSelectMessage,
  interpolate,
  normalizeSelectForms,
} from '@fluenti/core/runtime'
import type { MessageDescriptor } from '@fluenti/core'
import { PLURAL_CATEGORIES } from '../src/components/plural-core'
import { renderRichTranslation, serializeRichForms } from '../src/components/icu-rich'

const i18n = createFluentiCore({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: {} },
  interpolate,
})

function translate(descriptor: MessageDescriptor, values?: Record<string, unknown>): string {
  return i18n.t(descriptor, values) as string
}

const richPluralForms = {
  one: [createElement('strong', { key: 'one-marker' }, '#'), ' item'],
  other: [createElement('strong', { key: 'other-marker' }, '#'), ' items'],
}

const richSelectForms = {
  admin: [createElement('strong', { key: 'admin-label' }, 'Admin'), ' access'],
  editor: 'Can edit',
  other: createElement('em', { key: 'guest-label' }, 'Guest'),
}

const precomputedPlural = (() => {
  const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, richPluralForms)
  const message = buildICUPluralMessage(
    {
      ...(messages.one !== undefined ? { one: messages.one } : {}),
      other: messages.other ?? '',
    },
  )
  return { message, components }
})()

const precomputedSelect = (() => {
  const orderedKeys = ['admin', 'editor', 'other'] as const
  const { messages, components } = serializeRichForms(orderedKeys, richSelectForms)
  const normalized = normalizeSelectForms(
    Object.fromEntries(orderedKeys.map((key) => [key, messages[key] ?? ''])),
  )
  return {
    message: buildICUSelectMessage(normalized.forms),
    valueMap: normalized.valueMap,
    components,
  }
})()

describe('react rich component pipeline', () => {
  bench('Plural rich runtime path', () => {
    const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, richPluralForms)
    const message = buildICUPluralMessage(
      {
        ...(messages.one !== undefined ? { one: messages.one } : {}),
        other: messages.other ?? '',
      },
    )
    renderRichTranslation(
      { id: message, message },
      { count: 5 },
      translate,
      components,
    )
  })

  bench('Plural rich compiled path', () => {
    renderRichTranslation(
      { id: precomputedPlural.message, message: precomputedPlural.message },
      { count: 5 },
      translate,
      precomputedPlural.components,
    )
  })

  bench('Select rich runtime path', () => {
    const orderedKeys = ['admin', 'editor', 'other'] as const
    const { messages, components } = serializeRichForms(orderedKeys, richSelectForms)
    const normalized = normalizeSelectForms(
      Object.fromEntries(orderedKeys.map((key) => [key, messages[key] ?? ''])),
    )
    const message = buildICUSelectMessage(normalized.forms)
    renderRichTranslation(
      { id: message, message },
      { value: normalized.valueMap.admin ?? 'other' },
      translate,
      components,
    )
  })

  bench('Select rich compiled path', () => {
    renderRichTranslation(
      { id: precomputedSelect.message, message: precomputedSelect.message },
      { value: precomputedSelect.valueMap.admin ?? 'other' },
      translate,
      precomputedSelect.components,
    )
  })
})
