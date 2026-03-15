const messages: Record<string, string | ((values?: Record<string, unknown>) => string)> = {
  'Fluenti React Playground': 'Fluenti React プレイグラウンド',
  'Write text. Fluenti translates it. Zero config.': 'テキストを書くだけ。Fluenti が翻訳。設定不要。',
  'Built with Fluenti and React': 'Fluenti と React で構築',
  'Welcome to Fluenti': 'Fluenti へようこそ',
  'A modern i18n library for React': 'React のためのモダンな i18n ライブラリ',
  'Hello, {name}!': (v) => `こんにちは、${v?.name ?? '{name}'}さん！`,
  'You have {count} items in your cart.': (v) => `カートに ${v?.count ?? '{count}'} 個のアイテムがあります。`,
  'Current locale: {locale}': (v) => `現在のロケール：${v?.locale ?? '{locale}'}`,
  'Features': '機能',
  'Reactive locale switching': 'リアクティブなロケール切り替え',
  'Rich text with React components': 'React コンポーネント付きリッチテキスト',
  'Built-in plural support': '組み込みの複数形サポート',
  'Type-safe message catalogs': '型安全なメッセージカタログ',
  'Home': 'ホーム',
  'Plurals': '複数形',
  'Rich Text': 'リッチテキスト',
  'Add': '追加',
  'Remove': '削除',
  'Reset': 'リセット',
}

export default messages
