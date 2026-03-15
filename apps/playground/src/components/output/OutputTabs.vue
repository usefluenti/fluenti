<script setup lang="ts">
import { ref } from 'vue'
import type { ExtractedMessage } from '../../lib/extract'
import ErrorPanel from './ErrorPanel.vue'
import CodePanel from './CodePanel.vue'
import ExtractedPanel from './ExtractedPanel.vue'

defineProps<{
  transformedCode: string
  extractedMessages: readonly ExtractedMessage[]
  extractionError: string | null
  jsonOutput: string
  poOutput: string
  compiledDefault: string
  compiledSplit: string
}>()

type Tab = 'transformed' | 'extracted' | 'json' | 'po' | 'compiled' | 'split'

const tabs: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: 'transformed', label: 'Transformed' },
  { id: 'extracted', label: 'Extracted' },
  { id: 'json', label: 'JSON' },
  { id: 'po', label: 'PO' },
  { id: 'compiled', label: 'Compiled' },
  { id: 'split', label: 'Split' },
]

const activeTab = ref<Tab>('transformed')
</script>

<template>
  <div class="panel output-panel">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ 'tab--active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="panel__body">
      <ErrorPanel v-if="extractionError && activeTab === 'extracted'" :message="extractionError" />
      <template v-else>
        <CodePanel v-if="activeTab === 'transformed'" :code="transformedCode" language="vue" />
        <ExtractedPanel v-if="activeTab === 'extracted'" :messages="extractedMessages" />
        <CodePanel v-if="activeTab === 'json'" :code="jsonOutput" language="json" />
        <CodePanel v-if="activeTab === 'po'" :code="poOutput" language="po" />
        <CodePanel v-if="activeTab === 'compiled'" :code="compiledDefault" language="js" />
        <CodePanel v-if="activeTab === 'split'" :code="compiledSplit" language="js" />
      </template>
    </div>
  </div>
</template>
