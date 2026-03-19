// Re-export the client provider for use in layouts.
// This is a separate entry point so it can be imported without
// pulling in the webpack/Node.js dependencies from withFluenti.
export { ClientI18nProvider as I18nProvider } from './client-provider'
export type { ClientI18nProviderProps as I18nProviderProps } from './client-provider'
