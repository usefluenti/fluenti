'use client'

import { useI18n, Trans, msg } from '@fluenti/react'

// Lazy message descriptors defined outside the component tree —
// this is the pattern Lingui users rely on with defineMessage/msg
const PAGE_LABELS = {
  title: msg`Rich Text Demos`,
  subtitle: msg`Components for complex translations`,
}

export default function RichTextPage() {
  const { i18n } = useI18n()

  return (
    <div data-testid="richtext-page">
      <h1 data-testid="richtext-title">{i18n.t(PAGE_LABELS.title)}</h1>
      <p data-testid="richtext-subtitle">{i18n.t(PAGE_LABELS.subtitle)}</p>

      <h2>Trans</h2>
      <p data-testid="trans-link">
        <Trans>Read the <a href="/docs">documentation</a> for more info.</Trans>
      </p>
      <p data-testid="trans-bold">
        <Trans>This is <strong>important</strong> information.</Trans>
      </p>
      <p data-testid="trans-multi">
        <Trans>Please <a href="/login">sign in</a> or <strong>register</strong> to continue.</Trans>
      </p>
    </div>
  )
}
