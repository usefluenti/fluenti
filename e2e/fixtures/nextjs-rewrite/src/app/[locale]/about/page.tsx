import { t } from '@fluenti/next'

export default async function AboutPage() {
  const title = t`About`
  const desc = t`This is the about page.`

  return (
    <div data-testid="about-page">
      <h2 data-testid="about-title">{title}</h2>
      <p data-testid="about-desc">{desc}</p>
    </div>
  )
}
