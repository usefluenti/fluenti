export const en: Record<string, string> = {
  'plural.cart': '{count, plural, =0{Your cart is empty} one{You have # item} other{You have # items}}',
  'plural.arabic': '{count, plural, zero{No items} one{One item} two{Two items} few{# items (few)} many{# items (many)} other{# items}}',
  'select.nested': '{gender, select, male{He bought {count, plural, one{# gift} other{# gifts}}} female{She bought {count, plural, one{# gift} other{# gifts}}} other{They bought {count, plural, one{# gift} other{# gifts}}}}',
  'format.currency': '{amount, number, currency}',
  'format.percent': '{value, number, percent}',
  'fallback.exists': 'English fallback',
  'edge.empty': '',
  'edge.long': 'This is a very long message that contains more than two hundred characters to test rendering of long translations without any issues or truncation problems in the user interface layout and component rendering pipeline',
  'edge.special': 'Quotes: "hello" & <world> — braces: \'{\' literal \'}\'',
}

export const ja: Record<string, string> = {
  'plural.cart': '{count, plural, other{カートに#個の商品}}',
  'select.nested': '{gender, select, male{彼は{count, plural, other{#個のギフト}}を買った} female{彼女は{count, plural, other{#個のギフト}}を買った} other{彼らは{count, plural, other{#個のギフト}}を買った}}',
  'format.currency': '{amount, number, currency}',
  'format.percent': '{value, number, percent}',
  // 'fallback.exists' intentionally missing — tests fallback to en
  'edge.empty': '',
}

export const ar: Record<string, string> = {
  'plural.arabic': '{count, plural, zero{لا عناصر} one{عنصر واحد} two{عنصران} few{# عناصر} many{# عنصراً} other{# عنصر}}',
}
