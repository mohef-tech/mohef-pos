import { ArrowLeftRight, ShoppingCart } from 'lucide-react'
import type { AuthSession } from '@/types/auth'

interface CashierPlaceholderPageProps {
  session: AuthSession
  onBackToOwner?: () => void
}

export function CashierPlaceholderPage({
  session,
  onBackToOwner,
}: CashierPlaceholderPageProps) {
  const isOwner = session.user.role === 'owner'
  const accountLabel = isOwner ? session.user.email : session.user.username

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6 lg:py-12">
      <section className="rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#EFE6DA] text-[#A8643A]">
            <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[#2B1D14]">Layar Kasir</h1>
            <p className="text-sm text-[#5C4B40]">
              Masuk sebagai <span className="font-medium text-[#2B1D14]">{session.user.name}</span>
              {accountLabel ? (
                <>
                  {' '}
                  (<span className="font-mono-tabular text-[#6A594D]">{accountLabel}</span>)
                </>
              ) : null}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[#5C4B40]">
          Ruang transaksi kasir (pencarian nama atau scan barcode, tombol kemasan terpisah,
          keranjang belanja, dan pembayaran Tunai atau QRIS) sedang disiapkan untuk Langkah 3.
        </p>

        {isOwner && onBackToOwner ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={onBackToOwner}
              className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
            >
              <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Kembali ke Kelola Toko</span>
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
