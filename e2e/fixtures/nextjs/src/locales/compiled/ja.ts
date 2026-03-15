const messages: Record<string, string | ((values?: Record<string, unknown>) => string)> = {
  'Home': 'ホーム',
  'About': '概要',
  'Plurals': '複数形',
  'Welcome to Fluenti': 'Fluenti へようこそ',
  'This is the home page.': 'こちらはホームページです。',
  'Hello, {name}!': (v) => `こんにちは、${v?.name ?? '{name}'}さん！`,
  'About our project': '私たちのプロジェクトについて',
  'Learn more about Fluenti.': 'Fluenti についてもっと学びましょう。',
  'Contact us at {email}': (v) => `お問い合わせ：${v?.email ?? '{email}'}`,
  'Add': '追加',
  'Reset': 'リセット',
}
export default messages
