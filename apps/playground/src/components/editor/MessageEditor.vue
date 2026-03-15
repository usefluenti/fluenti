<script setup lang="ts">
import { ref, computed, watch, type Ref } from 'vue'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { useCodeMirror } from '../../composables/useCodeMirror'

const props = defineProps<{
  modelValue: string
  language: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
const content = ref(props.modelValue) as Ref<string>

const languageExtension = computed(() =>
  props.language === 'vue'
    ? html()
    : javascript({ jsx: true, typescript: true }),
)

useCodeMirror(containerRef, content, {
  language: languageExtension,
  onChange(value) {
    emit('update:modelValue', value)
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (val !== content.value) {
      content.value = val
    }
  },
)
</script>

<template>
  <div class="panel">
    <div class="panel__header">
      <span>Source Code</span>
      <span class="panel__header-lang">{{ language === 'vue' ? '.vue' : '.tsx' }}</span>
    </div>
    <div class="panel__body" ref="containerRef" />
  </div>
</template>

<style scoped>
.panel__header-lang {
  font-family: var(--font-mono);
  color: var(--color-accent);
  font-size: 11px;
}
</style>
