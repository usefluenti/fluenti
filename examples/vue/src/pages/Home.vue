<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@fluenti/vue'
import { msg } from '@fluenti/core'

const { locale, t, format } = useI18n()

const serverTemplate = ref('{user} just {action}')

const ROLES = {
  admin: msg`Administrator`,
  user: msg`Regular User`,
}
</script>

<template>
  <h2 v-t>Welcome to Fluenti</h2>
  <p v-t>A modern i18n library for Vue 3</p>
  <p v-t>Fluenti provides reactive translations, rich text support, and plural handling out of the box.</p>

  <div class="section">
    <h2>t`` — Compile-time Translations</h2>
    <div class="demo-item">
      <div class="demo-label">t`Hello, ${'World'}!`</div>
      <div>{{ t`Hello, ${'World'}!` }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">t`Current locale: ${locale}`</div>
      <div>{{ t`Current locale: ${locale}` }}</div>
    </div>
    <div class="demo-item">
      <div class="demo-label">t`You have ${5} items in your cart.`</div>
      <div>{{ t`You have ${5} items in your cart.` }}</div>
    </div>
  </div>

  <div class="section">
    <h2>format() — Direct ICU Formatting</h2>
    <p class="section-desc">Use <code>format()</code> for dynamic patterns not in the catalog — e.g. server-provided templates or user-generated content.</p>
    <div class="demo-item">
      <div class="demo-label">Server-provided template</div>
      <div>{{ format(serverTemplate, { user: 'Alice', action: 'logged in' }) }}</div>
    </div>
  </div>

  <div class="section">
    <h2 v-t>Features</h2>
    <ul>
      <li v-t>Reactive locale switching</li>
      <li v-t>Rich text with Vue components</li>
      <li v-t>Built-in plural support</li>
      <li v-t>Type-safe message catalogs</li>
    </ul>
  </div>

  <div class="section">
    <h2>msg`` — Lazy Messages from Constants</h2>
    <div class="demo-item">
      <div class="demo-label">msg`` — lazy messages from constants</div>
      <div>Admin: <span data-testid="msg-admin">{{ t(ROLES.admin) }}</span> / User: <span data-testid="msg-user">{{ t(ROLES.user) }}</span></div>
    </div>
  </div>

  <p data-testid="fallback-only">{{ t`This key only exists in English` }}</p>
</template>
