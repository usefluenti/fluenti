import type { Messages } from '../src/types'

// ── Message corpus: simple → complex ──

export const MESSAGES = {
  plain: 'Hello World',
  singleVar: 'Hello {name}',
  multiVar: '{x} + {y} = {result}',
  pluralSimple: '{count, plural, one {# item} other {# items}}',
  pluralArabic: '{count, plural, zero {no items} one {# item} two {# items} few {# items} many {# items} other {# items}}',
  pluralOffset: '{n, plural, offset:1 =0 {Nobody liked this} =1 {You liked this} one {You and # other liked this} other {You and # others liked this}}',
  select: '{gender, select, male {He went} female {She went} other {They went}}',
  nestedPluralSelect: '{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} female {{count, plural, one {She has # item} other {She has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}',
  functionNumber: '{amount, number, currency}',
  functionDate: '{date, date, short}',
  escapedQuotes: "It''s {name}''s turn",
  longMessage: buildLongMessage(),
} as const

function buildLongMessage(): string {
  const parts = [
    'Welcome to our application, {userName}! ',
    'You have {count, plural, one {# new notification} other {# new notifications}}. ',
    'Your account was created on {createdAt, date, short}. ',
    '{role, select, admin {You have full access to the system.} editor {You can edit content.} other {You have read-only access.}} ',
    'Current balance: {balance, number, currency}. ',
    'Last login was {lastLogin, date, short} at {lastLoginTime}. ',
    '{messageCount, plural, =0 {No messages} one {# message} other {# messages}} in your inbox. ',
    'Thank you for being a valued member since {memberSince, date, short}!',
  ]
  return parts.join('')
}

// ── Common interpolation values ──

export const VALUES = {
  simple: { name: 'World' },
  multiVar: { x: 1, y: 2, result: 3 },
  plural: { count: 5 },
  pluralOne: { count: 1 },
  pluralZero: { count: 0 },
  select: { gender: 'female' },
  nestedPluralSelect: { gender: 'male', count: 3 },
  functionNumber: { amount: 1234.56 },
  functionDate: { date: new Date(2025, 0, 15) },
  escapedQuotes: { name: 'Alice' },
  longMessage: {
    userName: 'Alice',
    count: 5,
    createdAt: new Date(2024, 0, 1),
    role: 'editor',
    balance: 1234.56,
    lastLogin: new Date(2025, 2, 10),
    lastLoginTime: '14:30',
    messageCount: 42,
    memberSince: new Date(2023, 5, 15),
  },
} as const

// ── Catalog generators ──

export function generateCatalog(size: number): Messages {
  const messages: Messages = {}
  for (let i = 0; i < size; i++) {
    messages[`msg_${i}`] = `Message number {n} for item ${i}`
  }
  return messages
}

export function generateCompiledCatalog(size: number): Messages {
  const messages: Messages = {}
  for (let i = 0; i < size; i++) {
    messages[`msg_${i}`] = ((values?: Record<string, unknown>) =>
      `Message number ${values?.n ?? ''} for item ${i}`) as Messages[string]
  }
  return messages
}

// ── Unique message generator (for cache-miss benchmarks) ──

let uniqueCounter = 0

export function uniqueMessage(): string {
  return `Unique message ${++uniqueCounter} with {name}`
}

export function resetUniqueCounter(): void {
  uniqueCounter = 0
}
