<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@fluenti/vue'

const { t, locale, setLocale } = useI18n()

const count = ref(0)
const role = ref('admin')
const demoDate = new Date(Date.UTC(2025, 0, 15, 12))
</script>

<template>
  <div>
    <div class="locale-switcher">
      <button data-testid="lang-en" @click="setLocale('en')">English</button>
      <button data-testid="lang-ja" @click="setLocale('ja')">日本語</button>
      <button data-testid="lang-zh" @click="setLocale('zh-CN')">中文</button>
    </div>

    <p data-testid="welcome">{{ t('Welcome to Fluenti') }}</p>

    <p data-testid="trans-basic">
      <Trans id="docs-link">Read the <a href="/docs">documentation</a> for more info.</Trans>
    </p>

    <p data-testid="plural-basic">
      <Plural id="cart-count" :value="count" zero="No items" one="# item" other="# items" />
    </p>
    <div class="controls">
      <button data-testid="count-add" @click="count += 1">Add</button>
      <button data-testid="count-reset" @click="count = 0">Reset</button>
    </div>

    <p data-testid="select-basic">
      <Select
        id="role-select"
        :value="role"
        :options="{ admin: 'Administrator', user: 'User' }"
        other="Guest"
      />
    </p>
    <div class="controls">
      <button data-testid="role-admin" @click="role = 'admin'">Admin</button>
      <button data-testid="role-user" @click="role = 'user'">User</button>
      <button data-testid="role-other" @click="role = 'other'">Other</button>
    </div>

    <p data-testid="date-basic">
      <DateTime :value="demoDate" />
    </p>

    <p data-testid="number-basic">
      <NumberFormat :value="1234.5" style="currency" />
    </p>

    <p data-testid="current-locale">Locale: {{ locale }}</p>
  </div>
</template>
