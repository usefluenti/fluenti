<script setup lang="ts">
import { useI18n } from '@fluenti/vue'
import { msg } from '@fluenti/core'

const { t, locale } = useI18n()

const PAGE_SUBTITLE = msg`A modern i18n framework`
</script>

<template>
  <div>
    <h2 v-t>Welcome to Fluenti</h2>
    <p v-t>A modern i18n library with SSR support</p>

    <div class="section">
      <h2 v-t>Compile-time Translations</h2>
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
      <h2>&lt;DateTime&gt; — Date Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">&lt;DateTime :value="Date.now()" /&gt; — default</div>
        <div><DateTime :value="Date.now()" /></div>
      </div>
      <div class="demo-item">
        <div class="demo-label">&lt;DateTime :value="Date.now()" style="short" /&gt;</div>
        <div><DateTime :value="Date.now()" style="short" /></div>
      </div>
      <div class="demo-item">
        <div class="demo-label">&lt;DateTime :value="Date.now()" style="long" /&gt;</div>
        <div><DateTime :value="Date.now()" style="long" /></div>
      </div>
    </div>

    <div class="section">
      <h2>&lt;NumberFormat&gt; — Number Formatting</h2>
      <div class="demo-item">
        <div class="demo-label">&lt;NumberFormat :value="1234567.89" /&gt; — default</div>
        <div><NumberFormat :value="1234567.89" /></div>
      </div>
      <div class="demo-item">
        <div class="demo-label">&lt;NumberFormat :value="42.5" style="currency" /&gt;</div>
        <div><NumberFormat :value="42.5" style="currency" /></div>
      </div>
      <div class="demo-item">
        <div class="demo-label">&lt;NumberFormat :value="0.856" style="percent" /&gt;</div>
        <div><NumberFormat :value="0.856" style="percent" /></div>
      </div>
      <div class="demo-item">
        <div class="demo-label">&lt;NumberFormat :value="1234.5" style="decimal" /&gt;</div>
        <div><NumberFormat :value="1234.5" style="decimal" /></div>
      </div>
    </div>

    <p data-testid="msg-subtitle">{{ t(PAGE_SUBTITLE) }}</p>

    <p data-testid="fallback-only">{{ t`This key only exists in English` }}</p>

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
