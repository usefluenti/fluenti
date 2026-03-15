/**
 * Legacy vue-i18n messages (these stay in vue-i18n format).
 * Simulates an existing app's translation file.
 */
export const legacyMessages = {
  en: {
    app: { title: 'Bridge Demo App' },
    legacy: {
      greeting: 'Hello from vue-i18n!',
      farewell: 'Goodbye from vue-i18n, {name}!',
      items: 'no items | one item | {count} items',
      status: 'Status: Active',
    },
  },
  ja: {
    app: { title: 'ブリッジデモアプリ' },
    legacy: {
      greeting: 'vue-i18nからこんにちは！',
      farewell: 'vue-i18nからさようなら、{name}！',
      items: 'アイテムなし | 1個のアイテム | {count}個のアイテム',
      status: 'ステータス：アクティブ',
    },
  },
}
