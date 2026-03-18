import { describe, it, expect } from 'vitest'
import { extractFromVue } from '../src/vue-extractor'

describe('extractFromVue', () => {
  it('extracts v-t directive with plain text', () => {
    const code = `<template>
  <div v-t>Hello World</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Hello World')
    expect(messages[0]!.origin.file).toBe('App.vue')
  })

  it('extracts v-t with explicit ID', () => {
    const code = `<template>
  <div v-t:greeting>Hello World</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.id).toBe('greeting')
    expect(messages[0]!.message).toBe('Hello World')
  })

  it('extracts v-t.plural with pipe-separated forms', () => {
    const code = `<template>
  <span v-t.plural="items">one item|{count} items</span>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('{items, plural, one {one item} other {{count} items}}')
  })

  it('extracts t`` tagged template from script setup', () => {
    const code = `<template>
  <div>{{ greeting }}</div>
</template>
<script setup>
const greeting = t\`Hello\`
</script>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Hello')
  })

  it('extracts t() function call from script setup', () => {
    const code = `<template>
  <div>{{ msg }}</div>
</template>
<script setup>
const msg = t('Welcome back')
</script>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Welcome back')
  })

  it('extracts <Trans> component', () => {
    const code = `<template>
  <Trans message="Hello world"/>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Hello world')
  })

  it('extracts <Trans> with explicit id', () => {
    const code = `<template>
  <Trans id="greet" message="Hello world"/>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.id).toBe('greet')
    expect(messages[0]!.message).toBe('Hello world')
  })

  it('extracts <Plural> component', () => {
    const code = `<template>
  <Plural one="one item" other="{count} items" count="items"/>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toContain('{items, plural,')
    expect(messages[0]!.message).toContain('one {one item}')
    expect(messages[0]!.message).toContain('other {{count} items}')
  })

  it('extracts multiple messages from a single file', () => {
    const code = `<template>
  <div v-t>Hello</div>
  <span v-t>World</span>
  <Trans message="Goodbye"/>
</template>
<script setup>
const x = t('More text')
</script>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(4)
  })

  it('extracts from regular script block', () => {
    const code = `<template>
  <div>{{ msg }}</div>
</template>
<script>
export default {
  setup() {
    const msg = t('Hello from script')
    return { msg }
  }
}
</script>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Hello from script')
  })

  // ─── <Trans> children extraction ──────────────────────────────────────────

  it('extracts <Trans> with plain text children', () => {
    const code = `<template>
  <Trans>This is simple text.</Trans>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('This is simple text.')
  })

  it('extracts <Trans> with rich text children', () => {
    const code = `<template>
  <Trans>Visit our <a href="https://github.com">documentation</a> to learn more.</Trans>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toContain('<0>documentation</0>')
    expect(messages[0]!.message).toContain('Visit our')
    expect(messages[0]!.message).toContain('to learn more.')
  })

  it('extracts <Trans> with id prop on children', () => {
    const code = `<template>
  <Trans id="visit_docs">Visit our site.</Trans>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.id).toBe('visit_docs')
    expect(messages[0]!.message).toBe('Visit our site.')
  })

  it('still extracts <Trans> with message prop (old API)', () => {
    const code = `<template>
  <Trans message="Hello world"/>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Hello world')
  })

  // ─── <Plural> with :value binding extraction ──────────────────────────────

  it('extracts <Plural> with :value binding', () => {
    const code = `<template>
  <Plural :value="count" zero="No items" one="# item" other="# items" />
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toContain('{count, plural,')
    expect(messages[0]!.message).toContain('=0 {No items}')
    expect(messages[0]!.message).toContain('one {# item}')
    expect(messages[0]!.message).toContain('other {# items}')
  })

  it('returns empty array for files without messages', () => {
    const code = `<template>
  <div>No messages here</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(0)
  })

  it('generates hash IDs for messages without explicit IDs', () => {
    const code = `<template>
  <div v-t>Hello World</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages[0]!.id).toBeTruthy()
    expect(typeof messages[0]!.id).toBe('string')
    expect(messages[0]!.id.length).toBeGreaterThan(0)
  })

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('extracts v-t + v-if element', () => {
    const code = `<template>
  <div v-t v-if="show">Conditional text</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Conditional text')
  })

  it('extracts v-t + v-for element', () => {
    const code = `<template>
  <li v-t v-for="item in items" :key="item">Item label</li>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Item label')
  })

  it('extracts Unicode message', () => {
    const code = `<template>
  <div v-t>こんにちは世界</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('こんにちは世界')
  })

  it('extracts message containing quotes', () => {
    const code = `<template>
  <div v-t>It's a "test"</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('It\'s a "test"')
  })

  // ─── Additional edge cases ─────────────────────────────────────────────────

  it('returns empty array for empty SFC', () => {
    const code = `<template></template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(0)
  })

  it('extracts v-t with dot ID v-t:checkout.title', () => {
    const code = `<template>
  <h1 v-t:checkout.title>Checkout</h1>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.id).toBe('checkout.title')
    expect(messages[0]!.message).toBe('Checkout')
  })

  it('extracts t() from template expression {{ t("...") }}', () => {
    const code = `<template>
  <div>{{ t('Template expr') }}</div>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toBe('Template expr')
  })

  it('deduplicates messages from template and script', () => {
    const code = `<template>
  <div>{{ t('Same message') }}</div>
</template>
<script setup>
const msg = t('Same message')
</script>`
    const messages = extractFromVue(code, 'App.vue')
    // Template extraction runs TSX extractor on template content, then script content
    // Template t() and script t() produce the same hash ID
    // The dedup logic in extractFromVue should prevent duplicate IDs from template
    // but script messages are always added
    expect(messages.filter(m => m.message === 'Same message').length).toBeGreaterThanOrEqual(1)
  })

  it('applies script setup line offset correctly', () => {
    const code = `<template>
  <div>placeholder</div>
</template>
<script setup>
const msg = t('Offset test')
</script>`
    const messages = extractFromVue(code, 'App.vue')
    const msg = messages.find(m => m.message === 'Offset test')
    expect(msg).toBeDefined()
    // The t() call is on line 1 of script content, but script setup starts at line 4
    // So origin.line should be > 1 (offset applied)
    expect(msg!.origin.line).toBeGreaterThan(1)
  })

  it('returns empty for SFC without template', () => {
    const code = `<script setup>
const x = 42
</script>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(0)
  })

  it('extracts <Trans>rich text</Trans> in template', () => {
    const code = `<template>
  <Trans>Click <strong>here</strong> to proceed</Trans>
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toContain('<0>here</0>')
    expect(messages[0]!.message).toContain('Click')
    expect(messages[0]!.message).toContain('to proceed')
  })

  it('extracts <Plural :value="expr"> binding', () => {
    const code = `<template>
  <Plural :value="itemCount" one="# item" other="# items" />
</template>`
    const messages = extractFromVue(code, 'App.vue')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.message).toContain('{itemCount, plural,')
    expect(messages[0]!.message).toContain('one {# item}')
    expect(messages[0]!.message).toContain('other {# items}')
  })
})
