const messages: Record<string, string | ((values?: Record<string, unknown>) => string)> = {
  'Fluenti React Playground': 'Fluenti React Playground',
  'Write text. Fluenti translates it. Zero config.': 'Write text. Fluenti translates it. Zero config.',
  'Built with Fluenti and React': 'Built with Fluenti and React',
  'Welcome to Fluenti': 'Welcome to Fluenti',
  'A modern i18n library for React': 'A modern i18n library for React',
  'Hello, {name}!': (v) => `Hello, ${v?.name ?? '{name}'}!`,
  'You have {count} items in your cart.': (v) => `You have ${v?.count ?? '{count}'} items in your cart.`,
  'Current locale: {locale}': (v) => `Current locale: ${v?.locale ?? '{locale}'}`,
  'Features': 'Features',
  'Reactive locale switching': 'Reactive locale switching',
  'Rich text with React components': 'Rich text with React components',
  'Built-in plural support': 'Built-in plural support',
  'Type-safe message catalogs': 'Type-safe message catalogs',
  'Home': 'Home',
  'Plurals': 'Plurals',
  'Rich Text': 'Rich Text',
  'Add': 'Add',
  'Remove': 'Remove',
  'Reset': 'Reset',
}

export default messages
