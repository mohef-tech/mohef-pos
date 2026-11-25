import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Printer, QrCode } from 'lucide-react'
import { ModalDialog } from '@/components/ModalDialog'
import { ApiError, logPrintReceipt } from '@/lib/api'
import { formatRupiah, formatStockNumber, formatTimestamp } from '@/lib/format'
import type { UserRole } from '@/types/auth'
import type { ReceiptSnapshot } from '@/types/pos'

interface ReceiptModalProps {
  open: boolean
  receipt: ReceiptSnapshot | null
  userRole: UserRole
  onClose: () => void
  onReceiptUpdated: (next: ReceiptSnapshot) => void
  onUnauthorized: () => void
}

const QR_GRID_SIZE = 21

// Deterministic visual matrix for QRIS Sandbox display (zero external QR dependency).
function buildSandboxQrMatrix(seedText: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: QR_GRID_SIZE }, () =>
    Array.from({ length: QR_GRID_SIZE }, () => false),
  )

  const paintFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
        grid[top + r][left + c] = isOuter || isInner
      }
    }
  }

  paintFinder(0, 0)
  paintFinder(0, QR_GRID_SIZE - 7)
  paintFinder(QR_GRID_SIZE - 7, 0)

  let hash = 2166136261
  for (let i = 0; i < seedText.length; i += 1) {
    hash ^= seedText.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  for (let r = 0; r < QR_GRID_SIZE; r += 1) {
    for (let c = 0; c < QR_GRID_SIZE; c += 1) {
      const inTopLeft = r < 8 && c < 8
      const inTopRight = r < 8 && c >= QR_GRID_SIZE - 8
      const inBottomLeft = r >= QR_GRID_SIZE - 8 && c < 8
      if (inTopLeft || inTopRight || inBottomLeft) continue

      hash ^= (r * 31 + c * 17) & 0xff
      hash = Math.imul(hash, 16777619)
      grid[r][c] = (hash >>> 0) % 3 !== 0
    }
  }

  return grid
}

export function ReceiptModal({
  open,
  receipt,
  userRole,
  onClose,
  onReceiptUpdated,
  onUnauthorized,
}: ReceiptModalProps) {
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  const qrMatrix = useMemo(() => {
    if (!receipt || receipt.transaction.payment_method !== 'qris') return null
    return buildSandboxQrMatrix(
      `${receipt.transaction.receipt_number}|${receipt.transaction.total_amount}`,
    )
  }, [receipt])

  if (!receipt) {
    return (
      <ModalDialog open={false} title="Ringkasan struk" onClose={onClose}>
        <div />
      </ModalDialog>
    )
  }

  const { transaction } = receipt
  const isCash = transaction.payment_method === 'cash'
  const isPaid = transaction.status === 'paid'
  const isCashierLimitReached = userRole === 'cashier' && receipt.printSequence >= 3

  const handlePrint = async () => {
    setPrintError(null)
    setPrinting(true)
    try {
      const result = await logPrintReceipt(transaction.id)
      const updated: ReceiptSnapshot = {
        ...receipt,
        printSequence: result.data.print_sequence,
        watermark: result.watermark,
      }
      onReceiptUpdated(updated)
      window.setTimeout(() => {
        window.print()
      }, 60)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized()
        return
      }
      if (error instanceof ApiError && error.status === 403) {
        setPrintError(
          'Batas cetak kasir (maksimal 3 kali) sudah tercapai. Hubungi Pemilik untuk cetak ulang berikutnya.',
        )
        return
      }
      setPrintError(
        error instanceof Error
          ? error.message
          : 'Gagal mencatat permintaan cetak struk. Transaksi tetap tersimpan.',
      )
    } finally {
      setPrinting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      title={isCash ? 'Transaksi berhasil' : 'Pembayaran QRIS dibuat'}
      description={`Nomor struk ${transaction.receipt_number}`}
      onClose={() => {
        setPrintError(null)
        onClose()
      }}
      size="md"
    >
      <div className="space-y-4">
        <div
          className={`flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-sm ${
            isPaid
              ? 'border-[#14532D]/20 bg-[#EAF4EE] text-[#14532D]'
              : 'border-[#7C4A15]/20 bg-[#FBF1DF] text-[#7C4A15]'
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          )}
          <div>
            <p className="font-medium">
              {isPaid ? 'Pembayaran tunai lunas' : 'Menunggu pembayaran QRIS (Mode Sandbox)'}
            </p>
            {!isPaid ? (
              <p className="mt-0.5 text-xs">
                Status lunas hanya diperbarui melalui callback payment gateway, bukan dari tangkapan
                layar pelanggan.
              </p>
            ) : null}
          </div>
        </div>

        {!isCash && qrMatrix ? (
          <div className="flex flex-col items-center rounded-[14px] border border-[#2B1D14]/10 bg-[#F6EFE6] p-4 text-center">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#5C4B40]">
              <QrCode className="h-4 w-4 text-[#A8643A]" strokeWidth={1.75} aria-hidden="true" />
              <span>QRIS dinamis sesuai nominal</span>
            </div>
            <div className="rounded-[12px] border border-[#2B1D14]/12 bg-[#FFFDF9] p-3">
              <svg
                width="168"
                height="168"
                viewBox={`0 0 ${QR_GRID_SIZE} ${QR_GRID_SIZE}`}
                role="img"
                aria-label={`Kode QRIS untuk ${transaction.receipt_number} sebesar ${formatRupiah(transaction.total_amount)}`}
                shapeRendering="crispEdges"
              >
                <rect width={QR_GRID_SIZE} height={QR_GRID_SIZE} fill="#FFFDF9" />
                {qrMatrix.map((row, r) =>
                  row.map((cell, c) =>
                    cell ? (
                      <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F2A24" />
                    ) : null,
                  ),
                )}
              </svg>
            </div>
            <p className="font-mono-tabular mt-3 text-xl font-semibold text-[#2B1D14]">
              {formatRupiah(transaction.total_amount)}
            </p>
            <p className="font-mono-tabular mt-0.5 text-xs text-[#6A594D]">
              {transaction.receipt_number}
            </p>
          </div>
        ) : null}

        <div className="pos-receipt-printable rounded-[14px] border border-[#2B1D14]/12 bg-[#FFFDF9] p-4">
          {receipt.watermark ? (
            <div className="mb-3 rounded-[8px] border border-[#6E1F2F]/25 bg-[#F7E8EB] py-1 text-center text-xs font-semibold tracking-[0.08em] text-[#6E1F2F]">
              {receipt.watermark} (CETAKAN KE-{receipt.printSequence})
            </div>
          ) : null}

          <div className="border-b border-dashed border-[#2B1D14]/20 pb-3 text-center">
            <p className="text-sm font-semibold text-[#2B1D14]">Mohef POS</p>
            <p className="font-mono-tabular mt-0.5 text-xs text-[#6A594D]">
              {transaction.receipt_number}
            </p>
            <p className="mt-1 text-xs text-[#5C4B40]">
              {formatTimestamp(transaction.created_at)} | Kasir: {receipt.cashierName}
            </p>
          </div>

          <ul className="divide-y divide-[#2B1D14]/8 py-2">
            {receipt.items.map((item) => (
              <li key={item.variantId} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2B1D14]">{item.productName}</p>
                  <p className="font-mono-tabular text-xs text-[#6A594D]">
                    {item.variantName} ({formatStockNumber(item.quantity)} x{' '}
                    {formatRupiah(item.priceAtTime)})
                  </p>
                </div>
                <span className="font-mono-tabular shrink-0 text-sm font-medium text-[#2B1D14]">
                  {formatRupiah(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 border-t border-dashed border-[#2B1D14]/20 pt-3 text-sm">
            <div className="flex items-center justify-between font-semibold text-[#2B1D14]">
              <span>Total bayar</span>
              <span className="font-mono-tabular text-base">
                {formatRupiah(transaction.total_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#5C4B40]">
              <span>Metode</span>
              <span>{isCash ? 'Tunai' : 'QRIS'}</span>
            </div>
            {isCash && receipt.cashReceived !== null ? (
              <>
                <div className="flex items-center justify-between text-xs text-[#5C4B40]">
                  <span>Uang diterima</span>
                  <span className="font-mono-tabular">{formatRupiah(receipt.cashReceived)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-[#14532D]">
                  <span>Kembalian</span>
                  <span className="font-mono-tabular">
                    {formatRupiah(receipt.changeAmount ?? 0)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {receipt.printSequence > 0 ? (
          <p className="text-xs text-[#5C4B40]">
            Riwayat cetak tercatat: <span className="font-mono-tabular font-medium">{receipt.printSequence}</span>{' '}
            kali
            {userRole === 'cashier' ? ' (batas kasir maksimal 3 kali per transaksi).' : '.'}
          </p>
        ) : null}

        {printError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[10px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3 py-2.5 text-sm text-[#6E1F2F]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{printError}</span>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing || isCashierLimitReached}
            className="motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-4 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA] disabled:opacity-55"
          >
            <Printer className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>
              {printing
                ? 'Mencatat cetak...'
                : receipt.printSequence > 0
                  ? 'Cetak ulang (SALINAN)'
                  : 'Cetak struk'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrintError(null)
              onClose()
            }}
            className="motion-interactive inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0F2A24] px-5 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
          >
            Transaksi baru
          </button>
        </div>
      </div>
    </ModalDialog>
  )
}
