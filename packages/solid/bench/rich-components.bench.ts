import { bench, describe } from 'vitest'
import { createRoot } from 'solid-js'
import { createFluenti } from '../src/index'
import {
  buildICUPluralMessage,
  buildICUSelectMessage,
  interpolate,
  normalizeSelectForms,
} from '@fluenti/core/runtime'
import { PLURAL_CATEGORIES } from '@fluenti/core/runtime'
import { reconstruct, serializeRichForms } from '../src/rich-dom'

let ctx: ReturnType<typeof createFluenti>

createRoot((dispose) => {
  ctx = createFluenti({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: {} },
    interpolate,
  })
  void dispose
})

function strong(text: string): HTMLElement {
  const element = document.createElement('strong')
  element.textContent = text
  return element
}

function em(text: string): HTMLElement {
  const element = document.createElement('em')
  element.textContent = text
  return element
}

const richPluralForms = {
  one: [strong('#'), ' item'],
  other: [strong('#'), ' items'],
}

const richSelectForms = {
  admin: [strong('Admin'), ' access'],
  editor: 'Can edit',
  other: em('Guest'),
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

describe('solid rich component pipeline', () => {
  bench('Plural rich runtime path', () => {
    const { messages, components } = serializeRichForms(PLURAL_CATEGORIES, richPluralForms)
    const message = buildICUPluralMessage(
      {
        ...(messages.one !== undefined ? { one: messages.one } : {}),
        other: messages.other ?? '',
      },
    )
    const translated = ctx.t({ id: message, message }, { count: 5 })
    reconstruct(translated, components)
  })

  bench('Plural rich compiled path', () => {
    const translated = ctx.t(
      { id: precomputedPlural.message, message: precomputedPlural.message },
      { count: 5 },
    )
    reconstruct(translated, precomputedPlural.components)
  })

  bench('Select rich runtime path', () => {
    const orderedKeys = ['admin', 'editor', 'other'] as const
    const { messages, components } = serializeRichForms(orderedKeys, richSelectForms)
    const normalized = normalizeSelectForms(
      Object.fromEntries(orderedKeys.map((key) => [key, messages[key] ?? ''])),
    )
    const message = buildICUSelectMessage(normalized.forms)
    const translated = ctx.t(
      { id: message, message },
      { value: normalized.valueMap.admin ?? 'other' },
    )
    reconstruct(translated, components)
  })

  bench('Select rich compiled path', () => {
    const translated = ctx.t(
      { id: precomputedSelect.message, message: precomputedSelect.message },
      { value: precomputedSelect.valueMap.admin ?? 'other' },
    )
    reconstruct(translated, precomputedSelect.components)
  })
})
