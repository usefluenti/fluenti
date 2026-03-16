import { Suspense } from 'react'
import { getI18n } from '@fluenti/next/__generated'

async function SlowContent() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const i18n = await getI18n()
  return (
    <p data-testid="streamed-content">{t`Streamed content loaded!`}</p>
  )
}

export default async function StreamingPage() {
  return (
    <div data-testid="streaming-page">
      <h1 data-testid="streaming-title">{t`Streaming`}</h1>
      <Suspense fallback={<p data-testid="streaming-fallback">Loading...</p>}>
        <SlowContent />
      </Suspense>
    </div>
  )
}
