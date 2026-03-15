<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="error-panel">{{ message }}</div>
</template>
