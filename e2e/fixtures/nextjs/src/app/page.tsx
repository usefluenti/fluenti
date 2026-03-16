'use client'

export default function Home() {
  const name = 'World'
  return (
    <div data-testid="home-page">
      <h1 data-testid="welcome">{t`Welcome to Fluenti`}</h1>
      <p data-testid="home-desc">{t`This is the home page.`}</p>
      <p data-testid="greeting">{t`Hello, ${name}!`}</p>
    </div>
  )
}
