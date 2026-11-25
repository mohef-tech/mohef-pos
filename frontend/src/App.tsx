import { useCallback, useState } from 'react'
import { AppShell, type WorkspaceMode } from '@/components/AppShell'
import { clearAuthSession, getStoredAuthSession, saveAuthSession } from '@/lib/api'
import { CashierPage } from '@/pages/CashierPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProductsPage } from '@/pages/ProductsPage'
import type { AuthSession } from '@/types/auth'

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession())
  const [ownerWorkspaceMode, setOwnerWorkspaceMode] = useState<WorkspaceMode>('owner')

  const handleLoginSuccess = (nextSession: AuthSession) => {
    saveAuthSession(nextSession)
    setSession(nextSession)
    setOwnerWorkspaceMode(nextSession.user.role === 'owner' ? 'owner' : 'cashier')
  }

  const handleLogout = useCallback(() => {
    clearAuthSession()
    setSession(null)
    setOwnerWorkspaceMode('owner')
  }, [])

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  const isOwner = session.user.role === 'owner'
  const activeWorkspaceMode: WorkspaceMode = isOwner ? ownerWorkspaceMode : 'cashier'

  return (
    <AppShell
      session={session}
      workspaceMode={activeWorkspaceMode}
      onWorkspaceModeChange={(mode) => {
        if (isOwner) setOwnerWorkspaceMode(mode)
      }}
      onLogout={handleLogout}
    >
      {activeWorkspaceMode === 'owner' ? (
        <ProductsPage onUnauthorized={handleLogout} />
      ) : (
        <CashierPage
          session={session}
          onUnauthorized={handleLogout}
          onBackToOwner={isOwner ? () => setOwnerWorkspaceMode('owner') : undefined}
        />
      )}
    </AppShell>
  )
}
