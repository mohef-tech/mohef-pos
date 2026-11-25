import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowLeftRight,
  BarChart3,
  Clock,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  ShoppingCart,
  Store,
  Users,
  X,
} from 'lucide-react'
import type { AuthSession } from '@/types/auth'

export type WorkspaceMode = 'owner' | 'cashier'
export type OwnerSection = 'products'

interface AppShellProps {
  session: AuthSession
  workspaceMode: WorkspaceMode
  onWorkspaceModeChange: (mode: WorkspaceMode) => void
  onLogout: () => void
  children: ReactNode
}

interface SidebarNavItem {
  id: string
  label: string
  icon: typeof Package
  active: boolean
  available: boolean
}

const OWNER_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'products', label: 'Produk & Stok', icon: Package, active: true, available: true },
  { id: 'sessions', label: 'Sesi Kasir', icon: Clock, active: false, available: false },
  { id: 'returns', label: 'Retur', icon: RotateCcw, active: false, available: false },
  { id: 'reports', label: 'Laporan', icon: BarChart3, active: false, available: false },
  { id: 'cashiers', label: 'Akun Kasir', icon: Users, active: false, available: false },
]

export function AppShell({
  session,
  workspaceMode,
  onWorkspaceModeChange,
  onLogout,
  children,
}: AppShellProps) {
  const isOwner = session.user.role === 'owner'
  const showOwnerChrome = isOwner && workspaceMode === 'owner'

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    if (!mobileDrawerOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileDrawerOpen])

  const handleSwitchMode = (nextMode: WorkspaceMode) => {
    if (!isOwner || nextMode === workspaceMode) return
    setMobileDrawerOpen(false)
    onWorkspaceModeChange(nextMode)
  }

  return (
    <div className="min-h-dvh bg-[#F6EFE6] text-[#2B1D14] flex flex-col">
      <header className="surface-dark sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#F6EFE6]/10 bg-[#0F2A24] px-3 text-[#F6EFE6] sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {showOwnerChrome ? (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((prev) => !prev)}
              aria-label={mobileDrawerOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={mobileDrawerOpen}
              className="motion-interactive inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#F6EFE6] hover:bg-[#173B32] lg:hidden"
            >
              {mobileDrawerOpen ? (
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          ) : null}

          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#173B32] text-[#D8C28A]">
              <Store className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold tracking-[-0.01em] text-[#F6EFE6]">
              Mohef POS
            </span>
          </div>

          {!isOwner ? (
            <span className="rounded-[6px] bg-[#173B32] px-2 py-0.5 text-xs font-medium text-[#D8C28A]">
              Ruang Kasir
            </span>
          ) : workspaceMode === 'cashier' ? (
            <span className="rounded-[6px] bg-[#173B32] px-2 py-0.5 text-xs font-medium text-[#D8C28A]">
              Mode Kasir
            </span>
          ) : null}
        </div>

        {showOwnerChrome ? (
          <div
            role="group"
            aria-label="Pengalih ruang kerja"
            className="flex items-center rounded-full border border-[#F6EFE6]/12 bg-[#0B201B] p-0.5"
          >
            <button
              type="button"
              onClick={() => handleSwitchMode('cashier')}
              aria-pressed={false}
              className="motion-pill inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#B4C6BF] hover:text-[#F6EFE6] sm:px-3.5 sm:text-sm"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Mode Kasir</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('owner')}
              aria-pressed={true}
              className="motion-pill inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#A8643A] px-3 text-xs font-medium text-[#FFFDF9] sm:px-3.5 sm:text-sm"
            >
              <Store className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Kelola Toko</span>
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3">
          {isOwner && workspaceMode === 'cashier' ? (
            <button
              type="button"
              onClick={() => handleSwitchMode('owner')}
              className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#A8643A] px-3.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#92522B]"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Kelola Toko</span>
            </button>
          ) : null}

          <span className="hidden max-w-[160px] truncate text-sm text-[#B4C6BF] md:inline">
            {session.user.name}
          </span>

          <button
            type="button"
            onClick={onLogout}
            className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {showOwnerChrome ? (
          <>
            <aside
              aria-label="Navigasi ruang pemilik"
              className={`surface-dark hidden shrink-0 flex-col border-r border-[#F6EFE6]/10 bg-[#0F2A24] text-[#F6EFE6] lg:flex ${
                sidebarCollapsed ? 'w-[72px]' : 'w-[224px]'
              }`}
            >
              <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Menu utama pemilik">
                {OWNER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  if (item.available) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-current={item.active ? 'page' : undefined}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`motion-interactive relative flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-medium ${
                          item.active
                            ? 'bg-[#173B32] text-[#F6EFE6]'
                            : 'text-[#B4C6BF] hover:bg-[#173B32]/60 hover:text-[#F6EFE6]'
                        } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        {item.active ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#D8C28A]"
                          />
                        ) : null}
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            item.active ? 'text-[#D8C28A]' : 'text-[#B4C6BF]'
                          }`}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                      </button>
                    )
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled
                      title={
                        sidebarCollapsed
                          ? `${item.label} (tersedia pada tahap lanjut)`
                          : 'Tersedia pada tahap lanjut'
                      }
                      className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm text-[#B4C6BF]/55 ${
                        sidebarCollapsed ? 'justify-center px-0' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        {!sidebarCollapsed ? <span className="truncate">{item.label}</span> : null}
                      </span>
                      {!sidebarCollapsed ? (
                        <span className="font-mono-tabular shrink-0 rounded-[6px] bg-[#173B32]/70 px-1.5 py-0.5 text-[11px] text-[#B4C6BF]">
                          Segera
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </nav>

              <div className="border-t border-[#F6EFE6]/10 p-3">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
                  className={`motion-interactive flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-sm text-[#B4C6BF] hover:bg-[#173B32] hover:text-[#F6EFE6] ${
                    sidebarCollapsed ? 'justify-center px-0' : ''
                  }`}
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <>
                      <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>Ciutkan menu</span>
                    </>
                  )}
                </button>
              </div>
            </aside>

            {mobileDrawerOpen ? (
              <div className="fixed inset-0 top-14 z-40 flex lg:hidden">
                <div
                  aria-hidden="true"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="fixed inset-0 top-14 bg-[#0B201B]/60"
                />
                <aside
                  aria-label="Navigasi ruang pemilik"
                  className="surface-dark relative z-10 flex w-[256px] max-w-[80vw] flex-col border-r border-[#F6EFE6]/10 bg-[#0F2A24] p-3 text-[#F6EFE6]"
                >
                  <nav className="flex flex-col gap-1" aria-label="Menu utama pemilik">
                    {OWNER_NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      if (item.available) {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMobileDrawerOpen(false)}
                            aria-current={item.active ? 'page' : undefined}
                            className="motion-interactive relative flex min-h-[44px] w-full items-center gap-3 rounded-[10px] bg-[#173B32] px-3 text-left text-sm font-medium text-[#F6EFE6]"
                          >
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#D8C28A]"
                            />
                            <Icon
                              className="h-[18px] w-[18px] shrink-0 text-[#D8C28A]"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                            <span>{item.label}</span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled
                          className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm text-[#B4C6BF]/55"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="font-mono-tabular shrink-0 rounded-[6px] bg-[#173B32]/70 px-1.5 py-0.5 text-[11px] text-[#B4C6BF]">
                            Segera
                          </span>
                        </button>
                      )
                    })}
                  </nav>
                </aside>
              </div>
            ) : null}
          </>
        ) : null}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
