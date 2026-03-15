<script setup lang="ts">
import { useI18n } from '@fluenti/vue'

const i18n = useI18n()
</script>

<template>
  <div>
    <h2 v-t>Welcome to Fluenti</h2>
    <p v-t>A modern i18n library with SSR support</p>

    <div class="section">
      <h2>$t() — Catalog Translations</h2>
      <div class="demo-item">
        <div class="demo-label">$t('Hello, {name}!', { name: 'World' })</div>
        <div>{{ $t('Hello, {name}!', { name: 'World' }) }}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">$t('Current locale: {locale}', { locale })</div>
        <div>{{ $t('Current locale: {locale}', { locale: i18n.locale.value }) }}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">$t('You have {count} items in your cart.', { count: 5 })</div>
        <div>{{ $t('You have {count} items in your cart.', { count: 5 }) }}</div>
      </div>
    </div>

    <div class="section">
      <h2>$d() — Date Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">$d(Date.now())</div>
        <div>{{ $d(Date.now()) }}</div>
      </div>
    </div>

    <div class="section">
      <h2>$n() — Number Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">$n(1234567.89)</div>
        <div>{{ $n(1234567.89) }}</div>
      </div>
      <div class="demo-item">
        <div class="demo-label">$n(0.42)</div>
        <div>{{ $n(0.42) }}</div>
      </div>
    </div>

    <div class="section">
      <h2 v-t>Features</h2>
      <ul>
        <li v-t>Server-side rendering</li>
        <li v-t>Locale detection from cookies</li>
        <li v-t>Hydration without flash</li>
        <li v-t>Reactive locale switching</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
ul {
  padding-left: 20px;
}

li {
  padding: 4px 0;
}
</style>
