/**
 * New fluenti messages (ICU MessageFormat).
 * Simulates messages that have been migrated to fluenti.
 */
export const fluentMessages = {
  en: {
    'new.welcome': 'Welcome to Fluenti!',
    'new.user': 'Current user: {name}',
    'new.count': '{count, plural, =0 {No messages} one {# message} other {# messages}}',
    'new.role': '{role, select, admin {Administrator} editor {Editor} other {Viewer}}',
  },
  ja: {
    'new.welcome': 'Fluentiへようこそ！',
    'new.user': '現在のユーザー：{name}',
    'new.count': '{count, plural, =0 {メッセージなし} other {#件のメッセージ}}',
    'new.role': '{role, select, admin {管理者} editor {編集者} other {閲覧者}}',
  },
}
