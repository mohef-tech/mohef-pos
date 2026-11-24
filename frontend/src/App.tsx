import { useState } from 'react'
import { LogOut, Store } from 'lucide-react'
import { clearAuthSession, getStoredAuthSession, saveAuthSession } from '@/lib/api'
import { LoginPage } from '@/pages/LoginPage'
import type { AuthSession } from '@/types/auth'

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession())

  const handleLoginSuccess = (nextSession: AuthSession) => {
    saveAuthSession(nextSession)
    setSession(nextSession)
  }

  const handleLogout = () => {
    clearAuthSession()
    setSession(null)
  }

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  const isOwner = session.user.role === 'owner'
  const accountLabel = isOwner ? session.user.email : session.user.username

  return (
    <div className="min-h-dvh bg-[#F6EFE6] text-[#2B1D14] flex flex-col">
      <header className="surface-dark flex h-14 items-center justify-between bg-[#0F2A24] px-4 text-[#F6EFE6] sm:px-6">
        <div className="flex items-center gap-2.5">
          <Store className="h-[18px] w-[18px] text-[#D8C28A]" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-sm font-semibold tracking-[-0.01em]">Mohef POS</span>
          <span className="rounded-[6px] bg-[#173B32] px-2 py-0.5 text-xs font-medium text-[#D8C28A]">
            {isOwner ? 'Pemilik' : 'Kasir'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#B4C6BF] sm:inline">{session.user.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center p-6">
        <section className="w-full rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] p-6">
          <h1 className="text-lg font-semibold text-[#2B1D14]">
            {isOwner ? 'Sesi Pemilik aktif' : 'Sesi Kasir aktif'}
          </h1>
          <p className="mt-1 text-sm text-[#5C4B40]">
            Anda masuk sebagai <span className="font-medium text-[#2B1D14]">{session.user.name}</span>
            {accountLabel ? (
              <>
                {' '}
                (<span className="font-mono-tabular text-[#6A594D]">{accountLabel}</span>)
              </>
            ) : null}
            .
          </p>
          <p className="mt-3 text-sm text-[#6A594D]">
            {isOwner
              ? 'Halaman Produk & Stok dan navigasi ruang pemilik akan dibangun pada langkah berikutnya.'
              : 'Layar Kasir akan dibangun pada tahap berikutnya.'}
          </p>
        </section>
      </main>
    </div>
  )
}
