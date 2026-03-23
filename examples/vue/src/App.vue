<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useI18n } from '@fluenti/vue'
import { getDirection } from '@fluenti/core'

const { locale, setLocale, getLocales, isLoading, preloadLocale } = useI18n()

const locales = computed(() => getLocales())

const localeLabels: Record<string, string> = {
  en: 'English',
  'zh-CN': '中文',
  ja: '日本語',
  ar: 'العربية',
}

watch(locale, (newLocale) => {
  document.documentElement.dir = getDirection(newLocale)
  document.cookie = `locale=${newLocale};path=/;max-age=31536000`
}, { immediate: true })

onMounted(() => {
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
  if (match && match[1] && match[1] !== locale.value) {
    setLocale(match[1])
  }
})
</script>

<template>
  <div class="app">
    <header>
      <div class="header-top">
        <h1 v-t>Fluenti Vue Playground</h1>
        <div class="lang-buttons">
          <button
            v-for="loc in locales"
            :key="loc"
            :class="{ active: loc === locale }"
            @click="setLocale(loc)"
            @mouseenter="preloadLocale(loc)"
          >
            {{ localeLabels[loc] || loc }}
          </button>
        </div>
      </div>
      <p class="tagline" v-t>Write text. Fluenti translates it. Zero config.</p>
      <div v-if="isLoading" class="loading-indicator" v-t>Loading translations...</div>
      <nav>
        <router-link to="/" data-testid="nav-home" v-t>Home</router-link>
        <router-link to="/plurals" data-testid="nav-plurals" v-t>Plurals</router-link>
        <router-link to="/richtext" data-testid="nav-richtext" v-t>Rich Text</router-link>
        <router-link to="/formatting" data-testid="nav-formatting" v-t>Formatting</router-link>
        <router-link to="/directives" data-testid="nav-directives" v-t>Directives</router-link>
        <router-link to="/script" data-testid="nav-script" v-t>Script</router-link>
      </nav>
    </header>

    <main>
      <router-view />
    </main>

    <footer>
      <p v-t>Built with Fluenti and Vue 3</p>
    </footer>
  </div>
</template>
