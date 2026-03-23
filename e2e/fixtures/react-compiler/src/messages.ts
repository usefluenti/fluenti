export const en: Record<string, string> = {
  'greeting': 'Hello, {name}!',
  'plural.items': '{count, plural, =0{No items} one{# item} other{# items}}',
  'select.gender': '{gender, select, male{He} female{She} other{They}} liked your post',
  'nested': '{gender, select, male{He bought {count, plural, one{# gift} other{# gifts}}} female{She bought {count, plural, one{# gift} other{# gifts}}} other{They bought {count, plural, one{# gift} other{# gifts}}}}',
  'format.currency': '{amount, number, currency}',
  'format.percent': '{value, number, percent}',
  'fallback.only-en': 'English only',
  'counter.label': 'Count: {count}',
}

export const ja: Record<string, string> = {
  'greeting': 'こんにちは、{name}！',
  'plural.items': '{count, plural, other{#個のアイテム}}',
  'select.gender': '{gender, select, male{彼} female{彼女} other{彼ら}}があなたの投稿にいいねしました',
  'nested': '{gender, select, male{彼は{count, plural, other{#個のギフト}}を買った} female{彼女は{count, plural, other{#個のギフト}}を買った} other{彼らは{count, plural, other{#個のギフト}}を買った}}',
  'format.currency': '{amount, number, currency}',
  'format.percent': '{value, number, percent}',
  'counter.label': 'カウント: {count}',
}
