import { t } from '@fluenti/react'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="layout-marketing">
      <nav data-testid="marketing-nav">
        <span data-testid="marketing-nav-title">{t`Marketing`}</span>
      </nav>
      {children}
    </div>
  )
}
