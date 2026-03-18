import { hashMessage } from '../../src'

export const contractLocale = 'ja' as const

export const transContract = {
  basic: {
    id: 'nav.home',
    message: 'Home',
    translation: 'ホーム',
    expectedText: 'ホーム',
  },
  rich: {
    context: 'hero.cta',
    comment: 'Primary hero CTA',
    message: 'Click <0>the <1>docs</1></0> now',
    translation: '今すぐ<0><1>ドキュメント</1></0>を見る',
    href: '/docs',
    expectedText: '今すぐドキュメントを見る',
  },
} as const

export const pluralContract = {
  context: 'invite.count',
  comment: 'Guest count beside the current user',
  value: 3,
  zeroValue: 0,
  zero: 'No guests yet',
  one: '# guest besides you',
  other: '# guests besides you',
  offset: 1,
  translation: '{count, plural, offset:1 =0 {まだ他の来客はいません} one {あなた以外に # 人の来客} other {あなた以外に # 人の来客}}',
  expectedText: 'あなた以外に 2 人の来客',
  expectedZeroText: 'まだ他の来客はいません',
} as const

export const selectContract = {
  context: 'access.role',
  comment: 'Role access label',
  value: 'admin',
  other: 'Guest access',
  options: {
    admin: 'Admin access',
    user: 'User access',
  },
  translation: '{value, select, admin {管理者アクセス} user {ユーザーアクセス} other {ゲストアクセス}}',
  expectedText: '管理者アクセス',
  precedence: {
    value: 'admin',
    other: 'Guest access',
    options: { admin: 'Options win' },
    directAdmin: 'Attrs lose',
    expectedText: 'Options win',
  },
  fallback: {
    value: 'manager',
    other: 'Guest access',
    directAdmin: 'Admin access',
    expectedText: 'Guest access',
  },
  rich: {
    context: 'access.role.rich',
    comment: 'Rich role access label',
    value: 'admin',
    other: 'Guest access',
    translation: '{value, select, admin {<0>管理者</0>アクセス} other {ゲストアクセス}}',
    expectedText: '管理者アクセス',
  },
} as const

export const contractMessageSources = {
  plural: '{count, plural, offset:1 =0 {No guests yet} one {# guest besides you} other {# guests besides you}}',
  select: '{value, select, admin {Admin access} user {User access} other {Guest access}}',
  selectRich: '{value, select, admin {<0>Admin</0> access} other {Guest access}}',
} as const

export const contractMessageIds = {
  transRich: hashMessage(transContract.rich.message, transContract.rich.context),
  plural: hashMessage(contractMessageSources.plural, pluralContract.context),
  select: hashMessage(contractMessageSources.select, selectContract.context),
  selectRich: hashMessage(contractMessageSources.selectRich, selectContract.rich.context),
} as const

export const contractMessages = {
  [contractLocale]: {
    [transContract.basic.id]: transContract.basic.translation,
    [contractMessageIds.transRich]: transContract.rich.translation,
    [contractMessageIds.plural]: pluralContract.translation,
    [contractMessageIds.select]: selectContract.translation,
    [contractMessageIds.selectRich]: selectContract.rich.translation,
  },
} as const
