<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@fluenti/vue'

const { locale, t, format } = useI18n()

const userName = ref('World')
const itemCount = ref(3)
const pluralIcu = '{n, plural, one {# item} other {# items}}'
const cartMessage = computed(() =>
  t`You have ${itemCount.value} items in your cart.`,
)
</script>

<template>
  <h2>Script Features — t`` / format()</h2>

  <div class="section">
    <h2>t`` in &lt;script setup&gt;</h2>

    <div class="demo-item">
      <div class="demo-label">t`Hello, ${userName}!`</div>
      <div>{{ t`Hello, ${userName}!` }}</div>
    </div>

    <div class="demo-item">
      <div class="demo-label">t`You have ${itemCount} items.`</div>
      <div>{{ t`You have ${itemCount} items.` }}</div>
    </div>

    <div class="demo-item">
      <div class="demo-label">t`Current locale: ${locale}`</div>
      <div>{{ t`Current locale: ${locale}` }}</div>
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>format() — ICU Patterns</h2>

    <div class="demo-item">
      <div class="demo-label">format('{count} items at {price} each', ...)</div>
      <div>{{ format('{count} items at {price} each', { count: 3, price: '$9.99' }) }}</div>
    </div>

    <div class="demo-item">
      <div class="demo-label">format(pluralIcu, { n: itemCount })</div>
      <div>{{ format(pluralIcu, { n: itemCount }) }}</div>
    </div>
  </div>

  <hr class="section-divider" />

  <div class="section">
    <h2>Interactive Controls</h2>

    <div class="demo-item">
      <label>
        Name: <input v-model="userName" class="demo-input" />
      </label>
      <div style="margin-top: 4px">{{ t`Hello, ${userName}!` }}</div>
    </div>

    <div class="demo-item">
      <div class="controls">
        <button @click="itemCount = Math.max(0, itemCount - 1)">−</button>
        <span class="counter-display">{{ itemCount }}</span>
        <button @click="itemCount++">+</button>
      </div>
      <div>{{ cartMessage }}</div>
    </div>
  </div>
</template>
