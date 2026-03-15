<script setup lang="ts">
import { usePlayground } from './composables/usePlayground'
import { usePresets } from './composables/usePresets'
import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import MessageEditor from './components/editor/MessageEditor.vue'
import OutputTabs from './components/output/OutputTabs.vue'

const {
  language,
  code,
  extractedMessages,
  extractionError,
  jsonOutput,
  poOutput,
  compiledDefault,
  compiledSplit,
  transformedCode,
} = usePlayground()

const { presets, activePreset, selectPreset } = usePresets(
  (presetCode, presetLanguage) => {
    code.value = presetCode
    language.value = presetLanguage
  },
)
</script>

<template>
  <AppHeader />
  <div class="app-layout">
    <AppSidebar
      :presets="presets"
      :active-preset="activePreset"
      @select="selectPreset"
    />
    <main class="app-main">
      <MessageEditor
        v-model="code"
        :language="language"
      />
      <OutputTabs
        :transformed-code="transformedCode"
        :extracted-messages="extractedMessages"
        :extraction-error="extractionError"
        :json-output="jsonOutput"
        :po-output="poOutput"
        :compiled-default="compiledDefault"
        :compiled-split="compiledSplit"
      />
    </main>
  </div>
</template>
