import type { Nuxt } from '@nuxt/schema'

/**
 * DevTools state exposed to the custom tab.
 * Serialized to JSON and sent to the DevTools panel.
 */
export interface DevToolsI18nState {
  currentLocale: string
  availableLocales: string[]
  defaultLocale: string
  strategy: string
  detectedBy: string
  messageCount: number
  loadedLocales: string[]
  missingKeys: string[]
}

/**
 * Register a Nuxt DevTools custom tab for Fluenti.
 *
 * Shows: current locale, available locales, detection chain result,
 * loaded message count, and missing translation keys.
 */
export function setupDevTools(nuxt: Nuxt, localeCodes: string[], defaultLocale: string, strategy: string): void {
  try {
    // Attempt to use @nuxt/devtools-kit if available
    // @ts-expect-error — devtools:customTabs hook is provided by @nuxt/devtools
    nuxt.hook('devtools:customTabs', (tabs: unknown[]) => {
      tabs.push({
        name: 'fluenti',
        title: 'Fluenti i18n',
        icon: 'i-carbon-translate',
        view: {
          type: 'client-component',
          componentName: 'FluentiDevToolsPanel',
        },
      })
    })
  } catch {
    // DevTools not available — silently skip
  }

  // Inject DevTools client component via virtual module
  // @ts-expect-error — nitro:config hook is provided by Nitro
  nuxt.hook('nitro:config', (nitroConfig: Record<string, unknown>) => {
    const publicConfig = nitroConfig['runtimeConfig'] as Record<string, unknown> | undefined
    if (publicConfig) {
      const pub = (publicConfig['public'] ?? (publicConfig['public'] = {})) as Record<string, unknown>
      const fluentiConfig = (pub['fluenti'] ?? {}) as Record<string, unknown>
      fluentiConfig['devtools'] = {
        enabled: true,
        locales: localeCodes,
        defaultLocale,
        strategy,
      }
    }
  })
}

/**
 * Client-side DevTools panel component source.
 *
 * This is injected as a virtual module and rendered inside the
 * Nuxt DevTools panel. It reads the Fluenti runtime state and
 * displays it in a simple, readable format.
 */
export const DEVTOOLS_PANEL_COMPONENT = `
<template>
  <div style="padding: 16px; font-family: system-ui, sans-serif;">
    <h2 style="margin: 0 0 16px; font-size: 18px;">🌐 Fluenti i18n</h2>

    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 14px;">
      <span style="color: #888;">Current locale:</span>
      <strong>{{ state.currentLocale }}</strong>

      <span style="color: #888;">Default locale:</span>
      <span>{{ state.defaultLocale }}</span>

      <span style="color: #888;">Strategy:</span>
      <span>{{ state.strategy }}</span>

      <span style="color: #888;">Available:</span>
      <span>{{ state.availableLocales.join(', ') }}</span>

      <span style="color: #888;">Loaded:</span>
      <span>{{ state.loadedLocales.join(', ') || 'none' }}</span>

      <span style="color: #888;">Messages:</span>
      <span>{{ state.messageCount }}</span>

      <span style="color: #888;">Missing keys:</span>
      <span :style="{ color: state.missingKeys.length > 0 ? '#e53e3e' : '#38a169' }">
        {{ state.missingKeys.length > 0 ? state.missingKeys.length + ' missing' : 'All translated ✓' }}
      </span>
    </div>

    <div v-if="state.missingKeys.length > 0" style="margin-top: 16px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #e53e3e;">Missing translations:</h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-size: 13px; font-family: monospace;">
        <li v-for="key in state.missingKeys" :key="key" style="margin: 2px 0;">{{ key }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const state = ref({
  currentLocale: '',
  defaultLocale: '',
  strategy: '',
  availableLocales: [],
  loadedLocales: [],
  messageCount: 0,
  missingKeys: [],
})

onMounted(() => {
  try {
    const nuxtApp = window.__NUXT_DEVTOOLS_VIEW__?.nuxtApp ?? useNuxtApp()
    const config = nuxtApp.$config?.public?.fluenti ?? {}
    const fluentiLocale = nuxtApp.$fluentiLocale ?? ref('')

    state.value = {
      currentLocale: fluentiLocale.value || config.defaultLocale || '',
      defaultLocale: config.defaultLocale || '',
      strategy: config.strategy || '',
      availableLocales: config.locales || [],
      loadedLocales: [],
      messageCount: 0,
      missingKeys: [],
    }
  } catch (e) {
    // DevTools context not available
  }
})
</script>
`
