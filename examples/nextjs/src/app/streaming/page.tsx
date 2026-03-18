import { Suspense } from 'react'
import { t } from '@fluenti/react'

async function SlowContent() {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return (
    <p data-testid="streamed-content">{t`Streamed content loaded!`}</p>
  )
}

export default async function StreamingPage() {
  return (
    <div data-testid="streaming-page">
      <h2 data-testid="streaming-title">{t`Streaming`}</h2>
      <Suspense fallback={<p data-testid="streaming-fallback">Loading...</p>}>
        <SlowContent />
      </Suspense>
    </div>
  )
}
