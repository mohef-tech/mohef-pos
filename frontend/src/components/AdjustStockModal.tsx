import { useId, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, Loader2, Minus, Plus } from 'lucide-react'
import { ModalDialog } from '@/components/ModalDialog'
import { ApiError, adjustProductStock } from '@/lib/api'
import { formatStockNumber, parseLocaleNumber } from '@/lib/format'
import type { AdjustStockResponse, Product } from '@/types/product'

type AdjustDirection = 'add' | 'reduce'

interface AdjustStockModalProps {
  product: Product | null
  onClose: () => void
  onAdjusted: (response: AdjustStockResponse) => void
  onUnauthorized: () => void
}

export function AdjustStockModal({
  product,
  onClose,
  onAdjusted,
  onUnauthorized,
}: AdjustStockModalProps) {
  const [direction, setDirection] = useState<AdjustDirection>('add')
  const [quantityInput, setQuantityInput] = useState('')
  const [reason, setReason] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const qtyId = useId()
  const qtyHintId = useId()
  const qtyErrorId = useId()
  const reasonId = useId()
  const reasonHintId = useId()
  const reasonErrorId = useId()

  const resetForm = () => {
    setDirection('add')
    setQuantityInput('')
    setReason('')
    setHasSubmitted(false)
    setIsSubmitting(false)
    setServerError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const currentStock = product?.base_stock ?? 0
  const parsedQty = parseLocaleNumber(quantityInput)
  const isValidPositiveQty = Number.isFinite(parsedQty) && parsedQty > 0
  const signedDelta = isValidPositiveQty ? (direction === 'add' ? parsedQty : -parsedQty) : 0
  const projectedStock = currentStock + signedDelta
  const wouldGoNegative = isValidPositiveQty && projectedStock < 0

  const qtyError =
    hasSubmitted && !isValidPositiveQty
      ? 'Masukkan jumlah penyesuaian lebih dari 0.'
      : wouldGoNegative
        ? `Stok tidak boleh kurang dari nol. Maksimal pengurangan adalah ${formatStockNumber(currentStock)}.`
        : null

  const reasonError =
    hasSubmitted && reason.trim().length === 0 ? 'Catatan alasan penyesuaian wajib diisi.' : null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!product) return
    setHasSubmitted(true)
    setServerError(null)

    const trimmedReason = reason.trim()
    if (!isValidPositiveQty || wouldGoNegative || trimmedReason.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await adjustProductStock({
        product_id: product.id,
        quantity: signedDelta,
        reason: trimmedReason,
      })
      resetForm()
      onAdjusted(response)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          onUnauthorized()
          return
        }
        setServerError(error.message)
      } else {
        setServerError('Gagal menyimpan penyesuaian stok. Silakan coba lagi.')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={product !== null}
      onClose={handleClose}
      title="Sesuaikan stok dasar"
      description={product ? `Produk: ${product.name}` : undefined}
      maxWidthClass="w-full max-w-lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {serverError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[10px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3.5 py-3 text-sm text-[#6E1F2F]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div>
          <span className="block text-sm font-medium text-[#2B1D14]">Jenis penyesuaian</span>
          <div
            role="group"
            aria-label="Pilih jenis penyesuaian stok"
            className="mt-1.5 grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              onClick={() => {
                setDirection('add')
                if (serverError) setServerError(null)
              }}
              aria-pressed={direction === 'add'}
              className={`motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border px-3 text-sm font-medium ${
                direction === 'add'
                  ? 'border-[#14532D] bg-[#14532D] text-[#FFFDF9]'
                  : 'border-[#2B1D14]/20 bg-[#FFFDF9] text-[#2B1D14] hover:bg-[#EFE6DA]'
              }`}
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Tambah stok</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('reduce')
                if (serverError) setServerError(null)
              }}
              aria-pressed={direction === 'reduce'}
              className={`motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border px-3 text-sm font-medium ${
                direction === 'reduce'
                  ? 'border-[#6E1F2F] bg-[#6E1F2F] text-[#FFFDF9]'
                  : 'border-[#2B1D14]/20 bg-[#FFFDF9] text-[#2B1D14] hover:bg-[#EFE6DA]'
              }`}
            >
              <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Kurangi stok</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor={qtyId} className="block text-sm font-medium text-[#2B1D14]">
            Jumlah (satuan dasar)
          </label>
          <p id={qtyHintId} className="mt-0.5 text-xs text-[#6A594D]">
            Masukkan angka positif (contoh: 10 atau 2,5).
          </p>
          <input
            id={qtyId}
            type="text"
            inputMode="decimal"
            required
            autoFocus
            value={quantityInput}
            onChange={(e) => {
              setQuantityInput(e.target.value)
              if (serverError) setServerError(null)
            }}
            placeholder="0"
            aria-invalid={qtyError ? 'true' : 'false'}
            aria-describedby={qtyError ? `${qtyHintId} ${qtyErrorId}` : qtyHintId}
            className="pos-input font-mono-tabular mt-1.5 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3.5 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
          />
          {qtyError ? (
            <p id={qtyErrorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6E1F2F]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{qtyError}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-[12px] border border-[#2B1D14]/10 bg-[#F6EFE6] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-xs text-[#5C4B40]">Stok saat ini</p>
              <p className="font-mono-tabular mt-0.5 text-base font-medium text-[#2B1D14]">
                {formatStockNumber(currentStock)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#6A594D]" strokeWidth={1.75} aria-hidden="true" />
            <div className="text-right">
              <p className="text-xs text-[#5C4B40]">Stok setelah disesuaikan</p>
              <p
                className={`font-mono-tabular mt-0.5 text-base font-medium ${
                  wouldGoNegative
                    ? 'text-[#6E1F2F]'
                    : isValidPositiveQty
                      ? direction === 'add'
                        ? 'text-[#14532D]'
                        : 'text-[#A8643A]'
                      : 'text-[#2B1D14]'
                }`}
              >
                {formatStockNumber(projectedStock)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={reasonId} className="block text-sm font-medium text-[#2B1D14]">
            Catatan alasan
          </label>
          <p id={reasonHintId} className="mt-0.5 text-xs text-[#6A594D]">
            Wajib diisi untuk pencatatan riwayat stok (misal: Restok supplier, barang rusak, atau selisih opname).
          </p>
          <textarea
            id={reasonId}
            rows={3}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (serverError) setServerError(null)
            }}
            placeholder="Tulis alasan penyesuaian stok..."
            aria-invalid={reasonError ? 'true' : 'false'}
            aria-describedby={reasonError ? `${reasonHintId} ${reasonErrorId}` : reasonHintId}
            className="pos-input mt-1.5 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
          />
          {reasonError ? (
            <p
              id={reasonErrorId}
              className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6E1F2F]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{reasonError}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#2B1D14]/10 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="motion-interactive inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-4 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA]"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || wouldGoNegative}
            className="motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#A8643A] px-5 text-sm font-medium text-[#FFFDF9] hover:bg-[#92522B] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan penyesuaian</span>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
