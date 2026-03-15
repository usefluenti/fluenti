import { Suspense } from 'react'
import { getI18n } from '@/lib/i18n.server'

async function SlowContent() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const i18n = await getI18n()
  return (
    <p data-testid="streamed-content">{i18n.t('Streamed content loaded!')}</p>
  )
}

export default async function StreamingPage() {
  return (
    <div data-testid="streaming-page">
      <h1 data-testid="streaming-title">Streaming</h1>
      <Suspense fallback={<p data-testid="streaming-fallback">Loading...</p>}>
        <SlowContent />
      </Suspense>
    </div>
  )
}
