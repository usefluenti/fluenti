<script setup lang="ts">
// @ts-nocheck — virtual module types not available in fixture
import {
  __switchLocale,
  __currentLocale,
  __loading,
} from 'virtual:fluenti/runtime'
</script>

<template>
  <div id="splitting-app">
    <nav>
      <router-link to="/" data-testid="nav-home">{{ $t('Home') }}</router-link>
      <router-link to="/about" data-testid="nav-about">{{ $t('About') }}</router-link>
    </nav>

    <div class="locale-switcher">
      <button
        data-testid="lang-en"
        :class="{ active: __currentLocale === 'en' }"
        @click="__switchLocale('en')"
      >English</button>
      <button
        data-testid="lang-ja"
        :class="{ active: __currentLocale === 'ja' }"
        @click="__switchLocale('ja')"
      >日本語</button>
    </div>

    <p v-if="__loading" data-testid="loading">Loading...</p>

    <router-view />
  </div>
</template>
