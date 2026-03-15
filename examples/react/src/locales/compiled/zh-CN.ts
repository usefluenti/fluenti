const messages: Record<string, string | ((values?: Record<string, unknown>) => string)> = {
  'Fluenti React Playground': 'Fluenti React 练习场',
  'Write text. Fluenti translates it. Zero config.': '只需编写文本。Fluenti 为你翻译。零配置。',
  'Built with Fluenti and React': '使用 Fluenti 和 React 构建',
  'Welcome to Fluenti': '欢迎使用 Fluenti',
  'A modern i18n library for React': 'React 的现代国际化库',
  'Hello, {name}!': (v) => `你好，${v?.name ?? '{name}'}！`,
  'You have {count} items in your cart.': (v) => `购物车中有 ${v?.count ?? '{count}'} 件商品。`,
  'Current locale: {locale}': (v) => `当前语言：${v?.locale ?? '{locale}'}`,
  'Features': '特性',
  'Reactive locale switching': '响应式语言切换',
  'Rich text with React components': '使用 React 组件的富文本',
  'Built-in plural support': '内置复数支持',
  'Type-safe message catalogs': '类型安全的消息目录',
  'Home': '首页',
  'Plurals': '复数',
  'Rich Text': '富文本',
  'Add': '添加',
  'Remove': '移除',
  'Reset': '重置',
}

export default messages
