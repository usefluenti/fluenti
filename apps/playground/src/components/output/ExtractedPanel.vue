<script setup lang="ts">
import type { ExtractedMessage } from '../../lib/extract'

defineProps<{
  messages: readonly ExtractedMessage[]
}>()
</script>

<template>
  <div class="extracted-panel">
    <div v-if="messages.length === 0" class="extracted-empty">
      No messages extracted
    </div>
    <table v-else class="extracted-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Message</th>
          <th>Origin</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(msg, i) in messages" :key="i">
          <td class="extracted-id">{{ msg.id }}</td>
          <td class="extracted-msg">{{ msg.message }}</td>
          <td class="extracted-origin">{{ msg.origin.file }}:{{ msg.origin.line }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.extracted-panel {
  padding: 12px;
  overflow: auto;
  height: 100%;
}

.extracted-empty {
  color: var(--color-text-muted);
  font-size: 13px;
  font-family: var(--font-mono);
}

.extracted-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: var(--font-mono);
}

.extracted-table th {
  text-align: left;
  padding: 6px 10px;
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 10px;
  border-bottom: 1px solid var(--color-border);
}

.extracted-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  word-break: break-word;
}

.extracted-id {
  color: var(--color-accent);
  white-space: nowrap;
}

.extracted-msg {
  max-width: 400px;
}

.extracted-origin {
  color: var(--color-text-muted);
  white-space: nowrap;
  font-size: 11px;
}
</style>
