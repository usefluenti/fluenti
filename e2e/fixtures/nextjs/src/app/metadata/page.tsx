import type { Metadata } from 'next'
import { t } from '@fluenti/react'
import { getI18n } from '@fluenti/next/__generated'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: t`Metadata Page`,
  }
}

export default async function MetadataPage() {
  await getI18n()

  return (
    <div data-testid="metadata-page">
      <h1 data-testid="metadata-title">{t`Metadata Page`}</h1>
      <p data-testid="metadata-desc">{t`This page has translated metadata.`}</p>
    </div>
  )
}
