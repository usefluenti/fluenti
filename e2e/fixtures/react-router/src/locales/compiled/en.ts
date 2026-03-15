const messages: Record<string, string | ((values?: Record<string, unknown>) => string)> = {
  'Home': 'Home',
  'About': 'About',
  'Plurals': 'Plurals',
  'Welcome to Fluenti': 'Welcome to Fluenti',
  'This is the home page.': 'This is the home page.',
  'Hello, {name}!': (v) => `Hello, ${v?.name ?? '{name}'}!`,
  'About our project': 'About our project',
  'Learn more about Fluenti.': 'Learn more about Fluenti.',
  'Contact us at {email}': (v) => `Contact us at ${v?.email ?? '{email}'}`,
  'Add': 'Add',
  'Reset': 'Reset',
}
export default messages
