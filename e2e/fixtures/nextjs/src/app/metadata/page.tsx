import type { Metadata } from 'next'
import { getI18n } from '@/lib/i18n.server'

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n()
  return {
    title: i18n.t('Metadata Page'),
  }
}

export default async function MetadataPage() {
  const i18n = await getI18n()

  return (
    <div data-testid="metadata-page">
      <h1 data-testid="metadata-title">{i18n.t('Metadata Page')}</h1>
      <p data-testid="metadata-desc">{i18n.t('This page has translated metadata.')}</p>
    </div>
  )
}
