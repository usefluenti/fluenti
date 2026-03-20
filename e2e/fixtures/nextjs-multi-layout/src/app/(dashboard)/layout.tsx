import { t } from '@fluenti/react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="layout-dashboard">
      <nav data-testid="dashboard-nav">
        <span data-testid="dashboard-nav-title">{t`Dashboard`}</span>
      </nav>
      {children}
    </div>
  )
}
