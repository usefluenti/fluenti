import type { SourceLanguage } from './extract'

export interface Preset {
  readonly name: string
  readonly label: string
  readonly language: SourceLanguage
  readonly code: string
}

export const presets: readonly Preset[] = [
  {
    name: 'vue-basics',
    label: 'Vue: Basics',
    language: 'vue',
    code: `<template>
  <div>
    <h1 v-t>Welcome to Fluenti</h1>
    <p v-t>Hello {{ name }}, this is compile-time i18n</p>
    <button v-t:action.save>Save changes</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const name = ref('Alice')
const count = ref(3)

const greeting = t\`Hello \${name}, welcome back!\`
const itemCount = t\`You have \${count} items in your cart\`

function showAlert() {
  alert(t('Operation completed successfully'))
}
</script>`,
  },
  {
    name: 'vue-plurals',
    label: 'Vue: Plurals',
    language: 'vue',
    code: `<template>
  <div>
    <p v-t.plural="count">You have one item | You have # items</p>

    <!-- String props (classic) -->
    <Plural
      :value="count"
      zero="No messages"
      one="# message"
      two="# messages (dual)"
      few="# messages (few)"
      many="# messages (many)"
      other="# messages"
    />

    <!-- Rich text via named slots -->
    <Plural :value="count">
      <template #zero>No <strong>messages</strong> in your inbox</template>
      <template #one><em>1</em> message waiting</template>
      <template #other><strong>{{ count }}</strong> messages waiting</template>
    </Plural>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(5)
</script>`,
  },
  {
    name: 'vue-rich',
    label: 'Vue: Rich Text & Attrs',
    language: 'vue',
    code: `<template>
  <div>
    <Trans class="intro">
      Welcome to <strong>Fluenti</strong>, the compile-time i18n solution
    </Trans>
    <p v-t>Check our <a href="/docs">documentation</a> for more details</p>

    <img v-t.alt alt="Company logo" src="/logo.png" />
    <input v-t.placeholder placeholder="Enter your name" />
    <button v-t.title title="Click to submit the form" v-t>Submit</button>
  </div>
</template>

<script setup lang="ts">
</script>`,
  },
  {
    name: 'vue-select',
    label: 'Vue: Select & Nested',
    language: 'vue',
    code: `<template>
  <div>
    <h1 v-t>User profile</h1>
    <p>{{ genderMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const gender = ref('female')
const name = ref('Alice')
const count = ref(3)

const genderMessage = t('{gender, select, male {He} female {She} other {They}} liked your post', { gender })
</script>`,
  },
  {
    name: 'solid-basics',
    label: 'Solid: Basics',
    language: 'solid',
    code: `import { createSignal } from 'solid-js'

export default function App() {
  const [name, setName] = createSignal('World')
  const [count, setCount] = createSignal(5)

  const greeting = t\`Hello \${name()}\`
  const status = t('Welcome back')

  return (
    <div>
      <h1>{greeting()}</h1>
      <p>{status}</p>
      <Trans>Check our <a href="/docs">documentation</a></Trans>
    </div>
  )
}`,
  },
  {
    name: 'solid-advanced',
    label: 'Solid: Plurals & Select',
    language: 'solid',
    code: `import { createSignal } from 'solid-js'

export default function App() {
  const [count, setCount] = createSignal(3)
  const [gender, setGender] = createSignal('female')

  const genderMsg = t('{gender, select, male {He} female {She} other {They}} posted {count, plural, one {# comment} other {# comments}}', { gender: gender(), count: count() })

  return (
    <div>
      <h1>{genderMsg}</h1>
      <Plural
        value={count()}
        zero="No items"
        one="# item"
        two="# items (dual)"
        few="# items (few)"
        other="# items"
      />
    </div>
  )
}`,
  },
] as const
