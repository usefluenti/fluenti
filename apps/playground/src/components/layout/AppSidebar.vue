<script setup lang="ts">
import type { Preset } from '../../lib/presets'

defineProps<{
  presets: readonly Preset[]
  activePreset: string
}>()

const emit = defineEmits<{
  select: [preset: Preset]
}>()
</script>

<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__title">Presets</div>
    <ul class="preset-list">
      <li
        v-for="preset in presets"
        :key="preset.name"
        class="preset-item"
        :class="{ 'preset-item--active': activePreset === preset.name }"
        @click="emit('select', preset)"
      >
        <span class="preset-item__label">{{ preset.label }}</span>
        <span
          class="preset-item__badge"
          :class="`preset-item__badge--${preset.language}`"
        >
          {{ preset.language === 'vue' ? 'Vue' : 'Solid' }}
        </span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.preset-item__badge {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 3px;
}

.preset-item__badge--vue {
  color: #42b883;
  background: rgba(66, 184, 131, 0.12);
}

.preset-item__badge--solid {
  color: #4f88c6;
  background: rgba(79, 136, 198, 0.12);
}
</style>
