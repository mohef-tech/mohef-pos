import { useId, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, MinusCircle, PlusCircle } from 'lucide-react'
import { CurrencyInput } from '@/components/CurrencyInput'
import { ModalDialog } from '@/components/ModalDialog'
import { ApiError, closeCashierSession } from '@/lib/api'
import { formatRupiah, formatTimestamp, parseCurrencyDigits } from '@/lib/format'
import type { ActiveShiftState, CloseSessionSummary } from '@/types/pos'

interface CloseShiftModalProps {
  open: boolean
  activeShift: ActiveShiftState | null
  cashierName: string
  onClose: () => void
  onShiftClosed: () => void
  onUnauthorized: () => void
}

export function CloseShiftModal({
  open,
  activeShift,
  cashierName,
  onClose,
  onShiftClosed,
  onUnauthorized,
}: CloseShiftModalProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  const [actualCashInput, setActualCashInput] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CloseSessionSummary | null>(null)

  const parsedActualCash = parseCurrencyDigits(actualCashInput)
  const fieldError =
    touched && (actualCashInput.trim() === '' || !Number.isFinite(parsedActualCash) || parsedActualCash < 0)
      ? 'Masukkan jumlah uang fisik tunai minimal 0.'
      : null

  const resetLocalState = () => {
    setActualCashInput('')
    setTouched(false)
    setSubmitError(null)
    setSummary(null)
  }

  const handleCloseDialog = () => {
    const hadSummary = summary !== null
    resetLocalState()
    if (hadSummary) {
      onShiftClosed()
    } else {
      onClose()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    setSubmitError(null)

    const amount = parseCurrencyDigits(actualCashInput)
    if (!Number.isFinite(amount) || amount < 0) {
      return
    }

    setSubmitting(true)
    try {
      const response = await closeCashierSession({
        session_id: activeShift && activeShift.session.id > 0 ? activeShift.session.id : undefined,
        actual_cash: amount,
      })
      setSummary(response.summary)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized()
        return
      }
      if (error instanceof ApiError && error.status === 404) {
        setSubmitError('Sesi kasir aktif sudah ditutup di server.')
        onShiftClosed()
        return
      }
      setSubmitError(
        error instanceof Error ? error.message : 'Gagal menutup sesi kasir. Coba ulangi lagi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const estimatedExpectedCash = activeShift
    ? activeShift.session.starting_cash + activeShift.localCashSales
    : 0

  return (
    <ModalDialog
      open={open}
      title={summary ? 'Rekap penutupan shift' : 'Tutup shift kasir'}
      description={
        summary
          ? `Shift petugas ${cashierName} telah ditutup dan dicatat.`
          : 'Hitung uang tunai fisik di laci kasir lalu masukkan nominalnya.'
      }
      onClose={handleCloseDialog}
      size="md"
    >
      {summary ? (
        <div className="space-y-4">
          <div className="rounded-[14px] border border-[#2B1D14]/10 bg-[#F6EFE6] p-4">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#5C4B40]">Petugas (PIC)</dt>
                <dd className="font-medium text-[#2B1D14]">{cashierName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#5C4B40]">Modal awal tunai</dt>
                <dd className="font-mono-tabular text-[#2B1D14]">
                  {formatRupiah(summary.starting_cash)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#5C4B40]">Penjualan tunai</dt>
                <dd className="font-mono-tabular text-[#2B1D14]">
                  {formatRupiah(summary.cash_sales)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#5C4B40]">Penjualan QRIS</dt>
                <dd className="font-mono-tabular text-[#2B1D14]">
                  {formatRupiah(summary.qris_sales)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#5C4B40]">Pengembalian tunai (retur)</dt>
                <dd className="font-mono-tabular text-[#2B1D14]">
                  {formatRupiah(summary.total_refunds)}
                </dd>
              </div>

              <div className="border-t border-[#2B1D14]/12 pt-2.5">
                <div className="flex items-center justify-between">
                  <dt className="text-[#5C4B40]">Saldo tunai sistem</dt>
                  <dd className="font-mono-tabular font-medium text-[#2B1D14]">
                    {formatRupiah(summary.expected_cash)}
                  </dd>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <dt className="text-[#5C4B40]">Uang fisik dihitung</dt>
                  <dd className="font-mono-tabular font-medium text-[#2B1D14]">
                    {formatRupiah(summary.actual_cash)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div
            className={`flex items-center justify-between rounded-[12px] border px-4 py-3 ${
              Math.abs(summary.difference) < 0.01
                ? 'border-[#14532D]/20 bg-[#EAF4EE] text-[#14532D]'
                : summary.difference > 0
                  ? 'border-[#7C4A15]/20 bg-[#FBF1DF] text-[#7C4A15]'
                  : 'border-[#6E1F2F]/20 bg-[#F7E8EB] text-[#6E1F2F]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {Math.abs(summary.difference) < 0.01 ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              ) : summary.difference > 0 ? (
                <PlusCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <MinusCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>
                {Math.abs(summary.difference) < 0.01
                  ? 'Selisih kas: Pas'
                  : summary.difference > 0
                    ? 'Selisih kas: Lebih'
                    : 'Selisih kas: Kurang'}
              </span>
            </span>
            <span className="font-mono-tabular text-base font-semibold">
              {summary.difference > 0 ? '+' : ''}
              {formatRupiah(summary.difference)}
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleCloseDialog}
              className="motion-interactive inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0F2A24] px-5 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
            >
              Selesai
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {activeShift ? (
            <div className="rounded-[12px] border border-[#2B1D14]/10 bg-[#F6EFE6] p-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#5C4B40]">Petugas</span>
                <span className="font-medium text-[#2B1D14]">{cashierName}</span>
              </div>
              {activeShift.session.start_time ? (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[#5C4B40]">Mulai shift</span>
                  <span className="font-mono-tabular text-xs text-[#2B1D14]">
                    {formatTimestamp(activeShift.session.start_time)}
                  </span>
                </div>
              ) : null}
              {!activeShift.resumedFromServer ? (
                <>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[#5C4B40]">Modal awal</span>
                    <span className="font-mono-tabular text-[#2B1D14]">
                      {formatRupiah(activeShift.session.starting_cash)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[#5C4B40]">Perkiraan tunai di laci</span>
                    <span className="font-mono-tabular font-medium text-[#2B1D14]">
                      {formatRupiah(estimatedExpectedCash)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-[#5C4B40]">
                  Saldo sistem final akan dihitung langsung dari data server saat shift ditutup.
                </p>
              )}
            </div>
          ) : null}

          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-[#2B1D14]">
              Uang tunai fisik di laci
            </label>
            <p id={hintId} className="mt-0.5 text-xs text-[#6A594D]">
              Masukkan total uang tunai yang dihitung secara fisik sebelum menutup shift.
            </p>
            <CurrencyInput
              id={inputId}
              required
              value={actualCashInput}
              onValueChange={(digits) => setActualCashInput(digits)}
              onBlur={() => setTouched(true)}
              aria-invalid={fieldError ? 'true' : 'false'}
              aria-describedby={fieldError ? `${hintId} ${errorId}` : hintId}
              placeholder="Contoh: 450.000"
              wrapperClassName="mt-2"
            />
            {fieldError ? (
              <p
                id={errorId}
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#6E1F2F]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{fieldError}</span>
              </p>
            ) : null}
          </div>

          {!activeShift?.resumedFromServer && estimatedExpectedCash > 0 ? (
            <button
              type="button"
              onClick={() => {
                setActualCashInput(String(Math.round(estimatedExpectedCash)))
                setTouched(true)
              }}
              className="motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] border border-[#2B1D14]/15 bg-[#EFE6DA] px-3.5 text-xs font-medium text-[#2B1D14] hover:bg-[#E4D7C6]"
            >
              Isi sesuai perkiraan ({formatRupiah(estimatedExpectedCash)})
            </button>
          ) : null}

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3 py-2.5 text-sm text-[#6E1F2F]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCloseDialog}
              disabled={submitting}
              className="motion-interactive inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-4 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="motion-interactive inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#6E1F2F] px-5 text-sm font-medium text-[#FFFDF9] hover:bg-[#581825] disabled:opacity-60"
            >
              {submitting ? 'Menutup shift...' : 'Tutup shift & hitung selisih'}
            </button>
          </div>
        </form>
      )}
    </ModalDialog>
  )
}
