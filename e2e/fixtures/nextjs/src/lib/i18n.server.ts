import { createServerI18n } from '@fluenti/react/server'

export const { setLocale, getI18n } = createServerI18n({
  loadMessages: async (locale: string) => {
    switch (locale) {
      case 'ja': return import('@/locales/compiled/ja')
      case 'ar': return import('@/locales/compiled/ar')
      default: return import('@/locales/compiled/en')
    }
  },
  fallbackLocale: 'en',
  resolveLocale: async () => {
    const { cookies } = await import('next/headers')
    return (await cookies()).get('locale')?.value ?? 'en'
  },
})
