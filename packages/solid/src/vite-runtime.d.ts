declare module 'virtual:fluenti/runtime' {
  export const __switchLocale: ((locale: string) => Promise<void>) | undefined
  export const __preloadLocale: ((locale: string) => Promise<void>) | undefined
}
