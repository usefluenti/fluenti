<script setup lang="ts">
import { ref, inject } from 'vue'
import { BRIDGE_KEY } from '@fluenti/vue-i18n-compat'
import type { BridgeContext } from '@fluenti/vue-i18n-compat'

const bridge = inject(BRIDGE_KEY) as BridgeContext

const currentLocale = bridge.locale
const count = ref(0)
const userName = ref('Alice')
const userRole = ref('admin')

async function switchLocale(locale: string) {
  await bridge.setLocale(locale)
}
</script>

<template>
  <div id="bridge-app">
    <header>
      <h1 data-testid="title">{{ bridge.t('app.title') }}</h1>
      <div class="locale-switcher">
        <button
          data-testid="lang-en"
          :class="{ active: currentLocale === 'en' }"
          @click="switchLocale('en')"
        >English</button>
        <button
          data-testid="lang-ja"
          :class="{ active: currentLocale === 'ja' }"
          @click="switchLocale('ja')"
        >日本語</button>
      </div>
      <p data-testid="current-locale">Locale: {{ currentLocale }}</p>
    </header>

    <main>
      <!-- Section 1: Legacy vue-i18n messages (served via bridge fallback) -->
      <section data-testid="legacy-section">
        <h2>Legacy (vue-i18n)</h2>
        <p data-testid="legacy-greeting">{{ bridge.t('legacy.greeting') }}</p>
        <p data-testid="legacy-farewell">{{ bridge.t('legacy.farewell', { name: userName }) }}</p>
        <p data-testid="legacy-status">{{ bridge.t('legacy.status') }}</p>
      </section>

      <!-- Section 2: New fluenti messages -->
      <section data-testid="fluenti-section">
        <h2>New (Fluenti)</h2>
        <p data-testid="new-welcome">{{ bridge.t('new.welcome') }}</p>
        <p data-testid="new-user">{{ bridge.t('new.user', { name: userName }) }}</p>
        <p data-testid="new-count">{{ bridge.t('new.count', { count }) }}</p>
        <p data-testid="new-role">{{ bridge.t('new.role', { role: userRole }) }}</p>
      </section>

      <!-- Section 3: tc() for legacy plurals -->
      <section data-testid="tc-section">
        <h2>tc() Plural (Legacy)</h2>
        <p data-testid="tc-result">{{ bridge.tc('legacy.items', count) }}</p>
        <div class="controls">
          <button data-testid="count-dec" @click="count = Math.max(0, count - 1)">-</button>
          <span data-testid="count-value">{{ count }}</span>
          <button data-testid="count-inc" @click="count++">+</button>
        </div>
      </section>

      <!-- Section 4: te() existence check -->
      <section data-testid="te-section">
        <h2>te() Existence Check</h2>
        <p data-testid="te-fluenti">new.welcome exists: {{ bridge.te('new.welcome') }}</p>
        <p data-testid="te-legacy">legacy.greeting exists: {{ bridge.te('legacy.greeting') }}</p>
        <p data-testid="te-missing">missing.key exists: {{ bridge.te('missing.key') }}</p>
      </section>

      <!-- Section 5: Available locales -->
      <section data-testid="locales-section">
        <h2>Available Locales</h2>
        <p data-testid="available-locales">{{ bridge.availableLocales.value.join(', ') }}</p>
      </section>

      <!-- Section 6: Role selector (tests ICU select) -->
      <section data-testid="role-section">
        <h2>Role Select</h2>
        <select data-testid="role-select" v-model="userRole">
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <p data-testid="role-display">{{ bridge.t('new.role', { role: userRole }) }}</p>
      </section>
    </main>
  </div>
</template>

<style>
body { font-family: sans-serif; margin: 20px; }
header { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px; }
.locale-switcher { display: flex; gap: 4px; }
button { padding: 4px 12px; cursor: pointer; }
button.active { background: #4CAF50; color: white; }
section { margin-bottom: 24px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
h2 { margin: 0 0 8px; font-size: 1.1rem; }
.controls { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
</style>
