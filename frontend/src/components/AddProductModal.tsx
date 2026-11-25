import { useId, useState, type FormEvent } from 'react'
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import { ModalDialog } from '@/components/ModalDialog'
import { ApiError, createProduct } from '@/lib/api'
import { parseLocaleNumber } from '@/lib/format'
import type { CreateProductVariantInput, Product } from '@/types/product'

interface VariantDraft {
  key: string
  variantName: string
  conversionRate: string
  price: string
  barcode: string
}

interface AddProductModalProps {
  open: boolean
  onClose: () => void
  onCreated: (product: Product) => void
  onUnauthorized: () => void
}

function createEmptyVariant(index: number): VariantDraft {
  return {
    key: `variant-${Date.now()}-${index}`,
    variantName: '',
    conversionRate: '1',
    price: '',
    barcode: '',
  }
}

export function AddProductModal({
  open,
  onClose,
  onCreated,
  onUnauthorized,
}: AddProductModalProps) {
  const [name, setName] = useState('')
  const [baseStock, setBaseStock] = useState('0')
  const [variants, setVariants] = useState<VariantDraft[]>(() => [createEmptyVariant(0)])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const nameId = useId()
  const baseStockId = useId()
  const baseStockHintId = useId()
  const nameErrorId = useId()
  const baseStockErrorId = useId()

  const resetForm = () => {
    setName('')
    setBaseStock('0')
    setVariants([createEmptyVariant(0)])
    setHasSubmitted(false)
    setServerError(null)
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const updateVariant = (key: string, field: keyof Omit<VariantDraft, 'key'>, value: string) => {
    setVariants((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
    if (serverError) setServerError(null)
  }

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariant(prev.length)])
  }

  const handleRemoveVariant = (key: string) => {
    setVariants((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))
  }

  const parsedBaseStock = parseLocaleNumber(baseStock)
  const nameError = hasSubmitted && name.trim().length === 0 ? 'Nama produk wajib diisi.' : null
  const baseStockError =
    hasSubmitted && (!Number.isFinite(parsedBaseStock) || parsedBaseStock < 0)
      ? 'Stok awal harus berupa angka 0 atau lebih.'
      : null

  const getVariantErrors = (variant: VariantDraft) => {
    if (!hasSubmitted) {
      return { name: null, rate: null, price: null }
    }
    const rateNum = parseLocaleNumber(variant.conversionRate)
    const priceNum = parseLocaleNumber(variant.price)
    return {
      name: variant.variantName.trim().length === 0 ? 'Nama kemasan wajib diisi.' : null,
      rate: !Number.isFinite(rateNum) || rateNum <= 0 ? 'Isi konversi harus lebih dari 0.' : null,
      price: !Number.isFinite(priceNum) || priceNum < 0 ? 'Harga jual tidak valid.' : null,
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)
    setServerError(null)

    const trimmedName = name.trim()
    const stockValue = parseLocaleNumber(baseStock)
    if (trimmedName.length === 0 || !Number.isFinite(stockValue) || stockValue < 0) {
      return
    }

    const parsedVariants: CreateProductVariantInput[] = []
    for (const v of variants) {
      const vName = v.variantName.trim()
      const rate = parseLocaleNumber(v.conversionRate)
      const price = parseLocaleNumber(v.price)
      if (
        vName.length === 0 ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return
      }
      parsedVariants.push({
        variant_name: vName,
        conversion_rate: rate,
        price,
        barcode: v.barcode.trim(),
      })
    }

    setIsSubmitting(true)
    try {
      const created = await createProduct({
        name: trimmedName,
        base_stock: stockValue,
        variants: parsedVariants,
      })
      resetForm()
      onCreated(created)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          onUnauthorized()
          return
        }
        setServerError(error.message)
      } else {
        setServerError('Gagal menyimpan produk baru. Silakan coba lagi.')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onClose={handleClose}
      title="Tambah produk baru"
      description="Atur nama barang, stok awal dalam satuan dasar, dan minimal satu kemasan jual."
      maxWidthClass="w-full max-w-2xl"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor={nameId} className="block text-sm font-medium text-[#2B1D14]">
              Nama produk
            </label>
            <input
              id={nameId}
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (serverError) setServerError(null)
              }}
              placeholder="Contoh: Beras Pandan Wangi"
              aria-invalid={nameError ? 'true' : 'false'}
              aria-describedby={nameError ? nameErrorId : undefined}
              className="pos-input mt-1.5 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3.5 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
            />
            {nameError ? (
              <p id={nameErrorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6E1F2F]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{nameError}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={baseStockId} className="block text-sm font-medium text-[#2B1D14]">
              Stok awal (dasar)
            </label>
            <p id={baseStockHintId} className="mt-0.5 text-xs text-[#6A594D]">
              Dukung bulat atau desimal (kg).
            </p>
            <input
              id={baseStockId}
              type="text"
              inputMode="decimal"
              required
              value={baseStock}
              onChange={(e) => {
                setBaseStock(e.target.value)
                if (serverError) setServerError(null)
              }}
              placeholder="0"
              aria-invalid={baseStockError ? 'true' : 'false'}
              aria-describedby={
                baseStockError ? `${baseStockHintId} ${baseStockErrorId}` : baseStockHintId
              }
              className="pos-input font-mono-tabular mt-1.5 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3.5 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
            />
            {baseStockError ? (
              <p
                id={baseStockErrorId}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-[#6E1F2F]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{baseStockError}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#2B1D14]/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#2B1D14]">Varian kemasan jual</h2>
              <p className="text-xs text-[#5C4B40]">
                Setiap kemasan akan memotong stok dasar yang sama sesuai rasio konversi.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              className="motion-interactive inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#2B1D14]/20 bg-[#F6EFE6] px-3 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA]"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Tambah kemasan</span>
            </button>
          </div>

          <div className="space-y-3">
            {variants.map((variant, index) => {
              const errs = getVariantErrors(variant)
              const vNameId = `variant-name-${variant.key}`
              const vRateId = `variant-rate-${variant.key}`
              const vPriceId = `variant-price-${variant.key}`
              const vBarcodeId = `variant-barcode-${variant.key}`

              return (
                <fieldset
                  key={variant.key}
                  className="rounded-[14px] border border-[#2B1D14]/12 bg-[#F6EFE6]/55 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <legend className="text-xs font-semibold text-[#5C4B40]">
                      Kemasan {index + 1}
                    </legend>
                    {variants.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.key)}
                        aria-label={`Hapus kemasan ${index + 1}`}
                        className="motion-interactive inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#6E1F2F] hover:bg-[#F7E8EB]"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={vNameId} className="block text-xs font-medium text-[#5C4B40]">
                        1 kemasan bernama
                      </label>
                      <input
                        id={vNameId}
                        type="text"
                        required
                        value={variant.variantName}
                        onChange={(e) => updateVariant(variant.key, 'variantName', e.target.value)}
                        placeholder="Contoh: Eceran 1 Kg atau Karung 25 Kg"
                        aria-invalid={errs.name ? 'true' : 'false'}
                        className="pos-input mt-1 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
                      />
                      {errs.name ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#6E1F2F]">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span>{errs.name}</span>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor={vRateId} className="block text-xs font-medium text-[#5C4B40]">
                        Sama dengan berapa satuan dasar
                      </label>
                      <input
                        id={vRateId}
                        type="text"
                        inputMode="decimal"
                        required
                        value={variant.conversionRate}
                        onChange={(e) =>
                          updateVariant(variant.key, 'conversionRate', e.target.value)
                        }
                        placeholder="Contoh: 1 atau 25"
                        aria-invalid={errs.rate ? 'true' : 'false'}
                        className="pos-input font-mono-tabular mt-1 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
                      />
                      {errs.rate ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#6E1F2F]">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span>{errs.rate}</span>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={vPriceId}
                        className="block text-xs font-medium text-[#5C4B40]"
                      >
                        Harga jual (Rp)
                      </label>
                      <input
                        id={vPriceId}
                        type="text"
                        inputMode="decimal"
                        required
                        value={variant.price}
                        onChange={(e) => updateVariant(variant.key, 'price', e.target.value)}
                        placeholder="Contoh: 15000"
                        aria-invalid={errs.price ? 'true' : 'false'}
                        className="pos-input font-mono-tabular mt-1 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
                      />
                      {errs.price ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#6E1F2F]">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                          <span>{errs.price}</span>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={vBarcodeId}
                        className="block text-xs font-medium text-[#5C4B40]"
                      >
                        Barcode (opsional)
                      </label>
                      <input
                        id={vBarcodeId}
                        type="text"
                        value={variant.barcode}
                        onChange={(e) => updateVariant(variant.key, 'barcode', e.target.value)}
                        placeholder="Scan atau ketik kode barcode"
                        className="pos-input font-mono-tabular mt-1 h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] px-3 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
                      />
                    </div>
                  </div>
                </fieldset>
              )
            })}
          </div>
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
            disabled={isSubmitting}
            className="motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#0F2A24] px-5 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan produk</span>
            )}
          </button>
        </div>
      </form>
    </ModalDialog>
  )
}
