<script setup lang="ts">
defineProps<{
  code: string
  language: string
}>()
</script>

<template>
  <div class="output-code">{{ code }}</div>
</template>
