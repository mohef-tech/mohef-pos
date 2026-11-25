import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeftRight,
  Banknote,
  Barcode,
  CheckCircle2,
  Clock,
  Minus,
  PackageOpen,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { CloseShiftModal } from '@/components/CloseShiftModal'
import { CurrencyInput } from '@/components/CurrencyInput'
import { ReceiptModal } from '@/components/ReceiptModal'
import {
  ApiError,
  clearActiveShift,
  createTransaction,
  fetchProducts,
  getStoredActiveShift,
  openCashierSession,
  saveActiveShift,
} from '@/lib/api'
import {
  LOW_STOCK_THRESHOLD,
  estimateVariantAvailability,
  formatRupiah,
  formatStockNumber,
  formatTimestamp,
  parseCurrencyDigits,
  parseLocaleNumber,
} from '@/lib/format'
import type { AuthSession } from '@/types/auth'
import type {
  ActiveShiftState,
  CartItem,
  PaymentMethod,
  ReceiptSnapshot,
} from '@/types/pos'
import type { Product, ProductVariant } from '@/types/product'

interface CashierPageProps {
  session: AuthSession
  onUnauthorized: () => void
  onBackToOwner?: () => void
}

type CatalogFilter = 'all' | 'available' | 'low'

interface FlattenedVariant {
  product: Product
  variant: ProductVariant
}

const STARTING_CASH_PRESETS = [0, 100000, 200000, 500000]
const CASH_TENDER_PRESETS = [20000, 50000, 100000]

export function CashierPage({ session, onUnauthorized, onBackToOwner }: CashierPageProps) {
  const { user } = session
  const isOwner = user.role === 'owner'

  const startingCashInputId = useId()
  const startingCashHintId = useId()
  const startingCashErrorId = useId()
  const searchInputId = useId()
  const cashReceivedInputId = useId()
  const cashReceivedHintId = useId()
  const cashReceivedErrorId = useId()

  const searchInputRef = useRef<HTMLInputElement>(null)

  const [activeShift, setActiveShift] = useState<ActiveShiftState | null>(() =>
    getStoredActiveShift(user.business_id, user.id),
  )

  // Open shift form state
  const [startingCashInput, setStartingCashInput] = useState('0')
  const [startingCashTouched, setStartingCashTouched] = useState(false)
  const [openingShift, setOpeningShift] = useState(false)
  const [openShiftError, setOpenShiftError] = useState<string | null>(null)
  const [hasExistingServerShift, setHasExistingServerShift] = useState(false)

  // Products catalog state
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(() => Boolean(activeShift))
  const [productsError, setProductsError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all')
  const [scanFeedback, setScanFeedback] = useState<{
    tone: 'ok' | 'error'
    message: string
  } | null>(null)

  // Cart & checkout state
  const [cart, setCart] = useState<CartItem[]>([])
  const [qtyDrafts, setQtyDrafts] = useState<Record<number, string>>({})
  const [cartWarning, setCartWarning] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [cashReceivedTouched, setCashReceivedTouched] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Modals state
  const [lastReceipt, setLastReceipt] = useState<ReceiptSnapshot | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false)

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingProducts(true)
      setProductsError(null)
      try {
        const list = await fetchProducts(signal)
        setProducts(list)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized()
          return
        }
        setProductsError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat daftar produk. Periksa koneksi lalu coba lagi.',
        )
      } finally {
        setLoadingProducts(false)
      }
    },
    [onUnauthorized],
  )

  useEffect(() => {
    if (!activeShift) return
    const controller = new AbortController()
    let cancelled = false

    fetchProducts(controller.signal)
      .then((list) => {
        if (cancelled) return
        setProducts(list)
        setProductsError(null)
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return
        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized()
          return
        }
        setProductsError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat daftar produk. Periksa koneksi lalu coba lagi.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeShift, onUnauthorized])

  useEffect(() => {
    if (!activeShift || receiptModalOpen || closeShiftModalOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeShift, receiptModalOpen, closeShiftModalOpen])

  const updateShiftState = useCallback(
    (next: ActiveShiftState | null) => {
      setActiveShift(next)
      if (next) {
        saveActiveShift(user.business_id, user.id, next)
      } else {
        clearActiveShift(user.business_id, user.id)
      }
    },
    [user.business_id, user.id],
  )

  // Flatten variants as separate clickable entries per PRD 6A (never dropdowns).
  const allVariants = useMemo<FlattenedVariant[]>(() => {
    const flattened: FlattenedVariant[] = []
    for (const product of products) {
      const variants = product.variants ?? []
      for (const variant of variants) {
        flattened.push({ product, variant })
      }
    }
    return flattened
  }, [products])

  const productBaseStockMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const product of products) {
      map.set(product.id, product.base_stock)
    }
    return map
  }, [products])

  const cartUsedBaseStockByProduct = useMemo(() => {
    const used = new Map<number, number>()
    for (const item of cart) {
      const prev = used.get(item.productId) ?? 0
      used.set(item.productId, prev + item.quantity * item.conversionRate)
    }
    return used
  }, [cart])

  const cartQuantityByVariant = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of cart) {
      map.set(item.variantId, item.quantity)
    }
    return map
  }, [cart])

  const filteredVariants = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return allVariants.filter(({ product, variant }) => {
      const usedBase = cartUsedBaseStockByProduct.get(product.id) ?? 0
      const remainingBase = Math.max(0, product.base_stock - usedBase)

      if (catalogFilter === 'available' && remainingBase + 1e-9 < variant.conversion_rate) {
        return false
      }
      if (
        catalogFilter === 'low' &&
        (product.base_stock <= 0 || product.base_stock > LOW_STOCK_THRESHOLD)
      ) {
        return false
      }

      if (!needle) return true
      return (
        product.name.toLowerCase().includes(needle) ||
        variant.variant_name.toLowerCase().includes(needle) ||
        variant.barcode.toLowerCase().includes(needle)
      )
    })
  }, [allVariants, cartUsedBaseStockByProduct, catalogFilter, searchQuery])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart],
  )

  const parsedStartingCash = parseCurrencyDigits(startingCashInput)
  const startingCashFieldError =
    startingCashTouched &&
    (startingCashInput.trim() === '' ||
      !Number.isFinite(parsedStartingCash) ||
      parsedStartingCash < 0)
      ? 'Masukkan modal awal minimal Rp 0.'
      : null

  const parsedCashReceived = parseCurrencyDigits(cashReceivedInput)
  const cashShortfall =
    Number.isFinite(parsedCashReceived) && parsedCashReceived >= 0
      ? Math.max(0, cartTotal - parsedCashReceived)
      : cartTotal
  const cashChange =
    Number.isFinite(parsedCashReceived) && parsedCashReceived >= cartTotal
      ? parsedCashReceived - cartTotal
      : 0

  const cashReceivedFieldError =
    paymentMethod === 'cash' &&
    cashReceivedTouched &&
    cart.length > 0 &&
    (cashReceivedInput.trim() === '' ||
      !Number.isFinite(parsedCashReceived) ||
      parsedCashReceived < cartTotal)
      ? 'Uang diterima harus sama dengan atau lebih besar dari total bayar.'
      : null

  const handleOpenShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStartingCashTouched(true)
    setOpenShiftError(null)
    setHasExistingServerShift(false)

    const amount = parseCurrencyDigits(startingCashInput)
    if (!Number.isFinite(amount) || amount < 0) {
      return
    }

    setOpeningShift(true)
    try {
      const opened = await openCashierSession({ starting_cash: amount })
      updateShiftState({
        session: opened,
        resumedFromServer: false,
        localCashSales: 0,
        localQrisSales: 0,
        transactionCount: 0,
      })
      window.setTimeout(() => searchInputRef.current?.focus(), 60)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized()
        return
      }
      if (error instanceof ApiError && error.status === 409) {
        setHasExistingServerShift(true)
        setOpenShiftError(
          'Akun ini masih memiliki shift aktif di server. Anda dapat melanjutkannya langsung.',
        )
        return
      }
      setOpenShiftError(
        error instanceof Error ? error.message : 'Gagal membuka shift kasir. Coba lagi.',
      )
    } finally {
      setOpeningShift(false)
    }
  }

  const handleResumeServerShift = () => {
    // Session id 0 tells the backend to resolve the user's open session automatically.
    updateShiftState({
      session: {
        id: 0,
        business_id: user.business_id,
        user_id: user.id,
        start_time: '',
        end_time: null,
        starting_cash: 0,
        expected_cash: 0,
        actual_cash: 0,
        status: 'open',
      },
      resumedFromServer: true,
      localCashSales: 0,
      localQrisSales: 0,
      transactionCount: 0,
    })
    setOpenShiftError(null)
    setHasExistingServerShift(false)
    window.setTimeout(() => searchInputRef.current?.focus(), 60)
  }

  const trySetCartItemQuantity = (
    product: Product,
    variant: ProductVariant,
    nextQuantity: number,
  ): boolean => {
    setCartWarning(null)
    setCheckoutError(null)

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.variantId !== variant.id))
      setQtyDrafts((prev) => {
        const copy = { ...prev }
        delete copy[variant.id]
        return copy
      })
      return true
    }

    const totalBaseStock = productBaseStockMap.get(product.id) ?? product.base_stock
    const otherVariantsUsed = cart.reduce((sum, item) => {
      if (item.productId === product.id && item.variantId !== variant.id) {
        return sum + item.quantity * item.conversionRate
      }
      return sum
    }, 0)

    const requiredBase = nextQuantity * variant.conversion_rate
    if (otherVariantsUsed + requiredBase > totalBaseStock + 1e-9) {
      const remainingBase = Math.max(0, totalBaseStock - otherVariantsUsed)
      setCartWarning(
        `Stok dasar ${product.name} tidak mencukupi (tersisa ${formatStockNumber(remainingBase)} satuan dasar).`,
      )
      return false
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id)
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: product.id,
            productName: product.name,
            variantName: variant.variant_name,
            conversionRate: variant.conversion_rate,
            price: variant.price,
            barcode: variant.barcode,
            quantity: nextQuantity,
          },
        ]
      }
      return prev.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: nextQuantity } : item,
      )
    })

    setQtyDrafts((prev) => {
      const copy = { ...prev }
      delete copy[variant.id]
      return copy
    })
    return true
  }

  const handleAddVariant = (product: Product, variant: ProductVariant) => {
    const currentQty = cartQuantityByVariant.get(variant.id) ?? 0
    const added = trySetCartItemQuantity(product, variant, currentQty + 1)
    if (added) {
      setScanFeedback({
        tone: 'ok',
        message: `Ditambahkan: ${product.name} (${variant.variant_name})`,
      })
    }
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const raw = searchQuery.trim()
    if (!raw) return

    const needle = raw.toLowerCase()
    const exactBarcodeMatch = allVariants.find(
      ({ variant }) => variant.barcode.trim().toLowerCase() === needle,
    )

    if (exactBarcodeMatch) {
      const added = trySetCartItemQuantity(
        exactBarcodeMatch.product,
        exactBarcodeMatch.variant,
        (cartQuantityByVariant.get(exactBarcodeMatch.variant.id) ?? 0) + 1,
      )
      if (added) {
        setScanFeedback({
          tone: 'ok',
          message: `Scan masuk: ${exactBarcodeMatch.product.name} (${exactBarcodeMatch.variant.variant_name})`,
        })
        setSearchQuery('')
      }
      return
    }

    if (filteredVariants.length === 1) {
      const only = filteredVariants[0]
      const added = trySetCartItemQuantity(
        only.product,
        only.variant,
        (cartQuantityByVariant.get(only.variant.id) ?? 0) + 1,
      )
      if (added) {
        setScanFeedback({
          tone: 'ok',
          message: `Ditambahkan: ${only.product.name} (${only.variant.variant_name})`,
        })
        setSearchQuery('')
      }
      return
    }

    if (filteredVariants.length === 0) {
      setScanFeedback({
        tone: 'error',
        message: `Produk atau barcode "${raw}" tidak ditemukan.`,
      })
    }
  }

  const handleCommitQuantityDraft = (item: CartItem) => {
    const raw = qtyDrafts[item.variantId]
    if (raw === undefined) return
    const parsed = parseLocaleNumber(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyDrafts((prev) => {
        const copy = { ...prev }
        delete copy[item.variantId]
        return copy
      })
      return
    }
    const product = products.find((p) => p.id === item.productId)
    const variant = product?.variants?.find((v) => v.id === item.variantId)
    if (!product || !variant) return

    const ok = trySetCartItemQuantity(product, variant, parsed)
    if (!ok) {
      setQtyDrafts((prev) => {
        const copy = { ...prev }
        delete copy[item.variantId]
        return copy
      })
    }
  }

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (cart.length === 0 || !activeShift || checkingOut) return

    setCheckoutError(null)
    setCartWarning(null)

    if (paymentMethod === 'cash') {
      setCashReceivedTouched(true)
      if (!Number.isFinite(parsedCashReceived) || parsedCashReceived < cartTotal) {
        return
      }
    }

    setCheckingOut(true)
    const cartSnapshot = [...cart]
    const cashReceivedSnapshot = paymentMethod === 'cash' ? parsedCashReceived : null

    try {
      const created = await createTransaction({
        session_id: activeShift.session.id > 0 ? activeShift.session.id : undefined,
        payment_method: paymentMethod,
        items: cartSnapshot.map((item) => ({
          product_variant_id: item.variantId,
          quantity: item.quantity,
        })),
      })

      const receiptItems = cartSnapshot.map((item) => {
        const serverItem = created.items?.find((i) => i.product_variant_id === item.variantId)
        const priceAtTime = serverItem?.price_at_time ?? item.price
        const subtotal = serverItem?.subtotal ?? item.quantity * priceAtTime
        return {
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          priceAtTime,
          subtotal,
        }
      })

      const nextReceipt: ReceiptSnapshot = {
        transaction: created,
        items: receiptItems,
        cashierName: user.name,
        cashReceived: cashReceivedSnapshot,
        changeAmount:
          cashReceivedSnapshot !== null
            ? Math.max(0, cashReceivedSnapshot - created.total_amount)
            : null,
        printSequence: 0,
        watermark: '',
      }

      const nextShift: ActiveShiftState = {
        ...activeShift,
        session: {
          ...activeShift.session,
          id: created.session_id || activeShift.session.id,
          expected_cash:
            paymentMethod === 'cash'
              ? activeShift.session.expected_cash + created.total_amount
              : activeShift.session.expected_cash,
        },
        localCashSales:
          paymentMethod === 'cash'
            ? activeShift.localCashSales + created.total_amount
            : activeShift.localCashSales,
        localQrisSales:
          paymentMethod === 'qris'
            ? activeShift.localQrisSales + created.total_amount
            : activeShift.localQrisSales,
        transactionCount: activeShift.transactionCount + 1,
      }

      updateShiftState(nextShift)
      setCart([])
      setQtyDrafts({})
      setCashReceivedInput('')
      setCashReceivedTouched(false)
      setScanFeedback(null)
      setLastReceipt(nextReceipt)
      setReceiptModalOpen(true)

      void loadProducts()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized()
        return
      }
      if (
        error instanceof ApiError &&
        error.status === 400 &&
        error.message.toLowerCase().includes('sesi kasir')
      ) {
        updateShiftState(null)
        setOpenShiftError('Shift kasir tidak lagi aktif di server. Buka shift baru untuk transaksi.')
        return
      }
      setCheckoutError(
        error instanceof Error ? error.message : 'Transaksi gagal diproses. Coba ulangi lagi.',
      )
      void loadProducts()
    } finally {
      setCheckingOut(false)
    }
  }

  // Gate: Open Shift before accessing POS catalog and checkout
  if (!activeShift) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-8 sm:px-6 lg:py-12">
        <section className="rounded-[20px] border border-[#2B1D14]/10 bg-[#FFFDF9] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0F2A24] text-[#D8C28A]">
              <Banknote className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-[#2B1D14]">Buka shift kasir</h1>
              <p className="text-sm text-[#5C4B40]">
                Petugas: <span className="font-medium text-[#2B1D14]">{user.name}</span>
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#5C4B40]">
            Masukkan modal uang tunai awal di laci kasir untuk memulai pencatatan transaksi hari
            ini.
          </p>

          <form onSubmit={handleOpenShift} noValidate className="mt-5 space-y-4">
            <div>
              <label
                htmlFor={startingCashInputId}
                className="block text-sm font-medium text-[#2B1D14]"
              >
                Modal awal tunai
              </label>
              <p id={startingCashHintId} className="mt-0.5 text-xs text-[#6A594D]">
                Isi 0 jika laci kasir dimulai tanpa uang kembalian.
              </p>
              <CurrencyInput
                id={startingCashInputId}
                required
                value={startingCashInput}
                onValueChange={(digits) => setStartingCashInput(digits)}
                onBlur={() => setStartingCashTouched(true)}
                aria-invalid={startingCashFieldError ? 'true' : 'false'}
                aria-describedby={
                  startingCashFieldError
                    ? `${startingCashHintId} ${startingCashErrorId}`
                    : startingCashHintId
                }
                placeholder="Contoh: 200.000"
                wrapperClassName="mt-2"
              />
              {startingCashFieldError ? (
                <p
                  id={startingCashErrorId}
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#6E1F2F]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{startingCashFieldError}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat modal awal">
              {STARTING_CASH_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setStartingCashInput(String(preset))
                    setStartingCashTouched(true)
                  }}
                  className="motion-interactive font-mono-tabular inline-flex min-h-[44px] items-center rounded-[10px] border border-[#2B1D14]/15 bg-[#EFE6DA] px-3 text-xs font-medium text-[#2B1D14] hover:bg-[#E4D7C6]"
                >
                  {formatRupiah(preset)}
                </button>
              ))}
            </div>

            {openShiftError ? (
              <div
                role="alert"
                className="space-y-3 rounded-[12px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3.5 py-3 text-sm text-[#6E1F2F]"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{openShiftError}</span>
                </div>
                {hasExistingServerShift ? (
                  <button
                    type="button"
                    onClick={handleResumeServerShift}
                    className="motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
                  >
                    Lanjutkan shift aktif
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              {isOwner && onBackToOwner ? (
                <button
                  type="button"
                  onClick={onBackToOwner}
                  className="motion-interactive inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-4 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA]"
                >
                  <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Kelola Toko</span>
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={openingShift}
                className="motion-interactive inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-[#0F2A24] px-6 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32] disabled:opacity-60"
              >
                {openingShift ? 'Membuka shift...' : 'Buka shift sekarang'}
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  const estimatedDrawerCash = activeShift.session.starting_cash + activeShift.localCashSales

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-4 sm:px-5">
      {/* Shift Status Bar */}
      <section
        aria-label="Ringkasan shift aktif"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4EE] px-2.5 py-1 text-xs font-medium text-[#14532D]">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Shift aktif</span>
            </span>
            <h1 className="text-base font-semibold text-[#2B1D14]">Layar Kasir</h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C4B40]">
            {activeShift.session.start_time ? (
              <span>
                Mulai:{' '}
                <span className="font-mono-tabular font-medium text-[#2B1D14]">
                  {formatTimestamp(activeShift.session.start_time)}
                </span>
              </span>
            ) : (
              <span>Tersinkronisasi dengan sesi server</span>
            )}
            {!activeShift.resumedFromServer ? (
              <span>
                Perkiraan laci:{' '}
                <span className="font-mono-tabular font-medium text-[#2B1D14]">
                  {formatRupiah(estimatedDrawerCash)}
                </span>
              </span>
            ) : null}
            <span>
              Transaksi:{' '}
              <span className="font-mono-tabular font-medium text-[#2B1D14]">
                {activeShift.transactionCount}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={loadingProducts}
            aria-label="Muat ulang daftar produk dan stok"
            className="motion-interactive inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#2B1D14]/15 bg-[#FFFDF9] px-3 text-xs font-medium text-[#2B1D14] hover:bg-[#EFE6DA] disabled:opacity-55"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Segarkan stok</span>
          </button>

          {lastReceipt ? (
            <button
              type="button"
              onClick={() => setReceiptModalOpen(true)}
              className="motion-interactive inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#2B1D14]/15 bg-[#EFE6DA] px-3.5 text-xs font-medium text-[#2B1D14] hover:bg-[#E4D7C6]"
            >
              <Receipt className="h-4 w-4 text-[#A8643A]" strokeWidth={1.75} aria-hidden="true" />
              <span>Struk terakhir</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setCloseShiftModalOpen(true)}
            className="motion-interactive inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#6E1F2F]/25 bg-[#F7E8EB] px-3.5 text-xs font-medium text-[#6E1F2F] hover:bg-[#EFD7DC]"
          >
            <span>Tutup shift</span>
          </button>
        </div>
      </section>

      {/* Main Landscape Split: Left Catalog & Unified Input | Right Cart & Checkout */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Panel: Unified Search/Barcode & Variant Cards */}
        <section
          aria-label="Pencarian dan katalog kemasan"
          className="flex flex-col gap-3 rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] p-4"
        >
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <label htmlFor={searchInputId} className="sr-only">
                Cari nama produk atau scan barcode
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6A594D]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  if (scanFeedback) setScanFeedback(null)
                }}
                placeholder="Ketik nama barang atau scan barcode (F2)"
                autoComplete="off"
                className="pos-input h-12 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] pl-10 pr-10 text-base text-[#2B1D14] placeholder:text-[#6A594D]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setScanFeedback(null)
                    searchInputRef.current?.focus()
                  }}
                  aria-label="Hapus pencarian"
                  className="motion-interactive absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#6A594D] hover:bg-[#EFE6DA] hover:text-[#2B1D14]"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className="motion-interactive inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
            >
              <Barcode className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Tambah / Scan</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter katalog">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'available', label: 'Tersedia' },
                  { id: 'low', label: 'Stok menipis' },
                ] as const
              ).map((tab) => {
                const active = catalogFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCatalogFilter(tab.id)}
                    className={`motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] px-3.5 text-xs font-medium ${
                      active
                        ? 'bg-[#0F2A24] text-[#F6EFE6]'
                        : 'bg-[#EFE6DA] text-[#5C4B40] hover:bg-[#E4D7C6] hover:text-[#2B1D14]'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <span className="font-mono-tabular text-xs text-[#6A594D]">
              {filteredVariants.length} kemasan ditampilkan
            </span>
          </div>

          {scanFeedback ? (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-xs font-medium ${
                scanFeedback.tone === 'ok'
                  ? 'border-[#14532D]/20 bg-[#EAF4EE] text-[#14532D]'
                  : 'border-[#6E1F2F]/20 bg-[#F7E8EB] text-[#6E1F2F]'
              }`}
            >
              {scanFeedback.tone === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              )}
              <span>{scanFeedback.message}</span>
            </div>
          ) : null}

          {loadingProducts && products.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 rounded-[14px] border border-[#2B1D14]/8 bg-[#F6EFE6]"
                />
              ))}
            </div>
          ) : productsError ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 rounded-[14px] border border-[#6E1F2F]/20 bg-[#F7E8EB] p-4 text-sm text-[#6E1F2F]"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{productsError}</span>
              </div>
              <button
                type="button"
                onClick={() => void loadProducts()}
                className="motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] bg-[#6E1F2F] px-4 text-xs font-medium text-[#FFFDF9] hover:bg-[#581825]"
              >
                Muat ulang produk
              </button>
            </div>
          ) : filteredVariants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-[#2B1D14]/15 bg-[#F6EFE6]/60 px-6 py-12 text-center">
              <PackageOpen className="h-8 w-8 text-[#6A594D]" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-[#2B1D14]">
                {products.length === 0
                  ? 'Belum ada produk yang terdaftar'
                  : 'Tidak ada kemasan yang cocok dengan pencarian'}
              </p>
              <p className="mt-1 text-xs text-[#5C4B40]">
                {products.length === 0
                  ? 'Tambahkan produk dan varian kemasan di menu Kelola Toko terlebih dahulu.'
                  : 'Coba kata kunci lain atau hapus filter pencarian.'}
              </p>
              {products.length === 0 && isOwner && onBackToOwner ? (
                <button
                  type="button"
                  onClick={onBackToOwner}
                  className="motion-interactive mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-xs font-medium text-[#F6EFE6] hover:bg-[#173B32]"
                >
                  <ArrowLeftRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>Buka Kelola Toko</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredVariants.map(({ product, variant }) => {
                const usedBase = cartUsedBaseStockByProduct.get(product.id) ?? 0
                const remainingBase = Math.max(0, product.base_stock - usedBase)
                const remainingUnits = estimateVariantAvailability(
                  remainingBase,
                  variant.conversion_rate,
                )
                const isOutOfStock = remainingBase + 1e-9 < variant.conversion_rate
                const inCartQty = cartQuantityByVariant.get(variant.id) ?? 0

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddVariant(product, variant)}
                    className={`motion-interactive relative flex min-h-[116px] flex-col justify-between rounded-[14px] border p-3.5 text-left ${
                      isOutOfStock
                        ? 'border-[#2B1D14]/10 bg-[#EFE6DA]/60 opacity-65'
                        : inCartQty > 0
                          ? 'border-[#A8643A] bg-[#FFFDF9] ring-1 ring-[#A8643A]/25 hover:bg-[#F6EFE6]/60'
                          : 'border-[#2B1D14]/12 bg-[#FFFDF9] hover:border-[#A8643A]/60 hover:bg-[#F6EFE6]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#2B1D14]">
                          {product.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-[#5C4B40]">
                          {variant.variant_name}
                        </p>
                      </div>
                      {inCartQty > 0 ? (
                        <span className="font-mono-tabular shrink-0 rounded-full bg-[#A8643A] px-2 py-0.5 text-xs font-medium text-[#FFFDF9]">
                          {formatStockNumber(inCartQty)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <span className="font-mono-tabular text-base font-semibold text-[#2B1D14]">
                        {formatRupiah(variant.price)}
                      </span>

                      <div className="text-right">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F7E8EB] px-1.5 py-0.5 text-[11px] font-medium text-[#6E1F2F]">
                            <AlertCircle className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                            <span>Stok habis</span>
                          </span>
                        ) : (
                          <span className="font-mono-tabular block text-[11px] text-[#6A594D]">
                            Sisa {formatStockNumber(remainingUnits)}
                            {variant.conversion_rate !== 1
                              ? ` (${formatStockNumber(variant.conversion_rate)}x)`
                              : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Right Panel: Cart & Checkout */}
        <aside
          aria-label="Keranjang belanja dan pembayaran"
          className="flex flex-col rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] lg:sticky lg:top-[72px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#2B1D14]/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-[18px] w-[18px] text-[#A8643A]" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#2B1D14]">Keranjang</h2>
              <span className="font-mono-tabular rounded-full bg-[#EFE6DA] px-2 py-0.5 text-xs font-medium text-[#2B1D14]">
                {cart.length}
              </span>
            </div>

            {cart.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setCart([])
                  setQtyDrafts({})
                  setCartWarning(null)
                  setCheckoutError(null)
                }}
                className="motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-xs font-medium text-[#6E1F2F] hover:bg-[#F7E8EB]"
              >
                Kosongkan
              </button>
            ) : null}
          </div>

          {cartWarning ? (
            <div
              role="alert"
              className="mx-4 mt-3 flex items-start gap-2 rounded-[10px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3 py-2 text-xs font-medium text-[#6E1F2F]"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{cartWarning}</span>
            </div>
          ) : null}

          <div className="max-h-[340px] overflow-y-auto px-4 py-3 lg:max-h-[calc(100dvh-430px)] lg:min-h-[180px]">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShoppingCart className="h-7 w-7 text-[#6A594D]/70" strokeWidth={1.5} aria-hidden="true" />
                <p className="mt-2.5 text-sm font-medium text-[#2B1D14]">Keranjang masih kosong</p>
                <p className="mt-1 text-xs text-[#6A594D]">
                  Pilih kemasan produk di sebelah kiri atau scan barcode untuk menambahkan barang.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#2B1D14]/10">
                {cart.map((item) => {
                  const product = products.find((p) => p.id === item.productId)
                  const variant = product?.variants?.find((v) => v.id === item.variantId)
                  const draftValue = qtyDrafts[item.variantId] ?? String(item.quantity)

                  return (
                    <li key={item.variantId} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#2B1D14]">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[#5C4B40]">
                            {item.variantName} ·{' '}
                            <span className="font-mono-tabular">{formatRupiah(item.price)}</span>
                          </p>
                        </div>
                        <span className="font-mono-tabular shrink-0 text-sm font-semibold text-[#2B1D14]">
                          {formatRupiah(item.quantity * item.price)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Kurangi jumlah ${item.productName} ${item.variantName}`}
                            onClick={() => {
                              if (!product || !variant) return
                              const nextQty = Number((item.quantity - 1).toFixed(4))
                              trySetCartItemQuantity(product, variant, nextQty)
                            }}
                            className="motion-interactive inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#2B1D14]/15 bg-[#F6EFE6] text-[#2B1D14] hover:bg-[#EFE6DA]"
                          >
                            <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          </button>

                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Jumlah ${item.productName} ${item.variantName}`}
                            value={draftValue}
                            onChange={(event) =>
                              setQtyDrafts((prev) => ({
                                ...prev,
                                [item.variantId]: event.target.value,
                              }))
                            }
                            onBlur={() => handleCommitQuantityDraft(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                handleCommitQuantityDraft(item)
                              }
                            }}
                            className="pos-input font-mono-tabular h-11 w-20 rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-2 text-center text-base text-[#2B1D14]"
                          />

                          <button
                            type="button"
                            aria-label={`Tambah jumlah ${item.productName} ${item.variantName}`}
                            onClick={() => {
                              if (!product || !variant) return
                              const nextQty = Number((item.quantity + 1).toFixed(4))
                              trySetCartItemQuantity(product, variant, nextQty)
                            }}
                            className="motion-interactive inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#2B1D14]/15 bg-[#F6EFE6] text-[#2B1D14] hover:bg-[#EFE6DA]"
                          >
                            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        </div>

                        <button
                          type="button"
                          aria-label={`Hapus ${item.productName} ${item.variantName} dari keranjang`}
                          onClick={() => {
                            if (!product || !variant) return
                            trySetCartItemQuantity(product, variant, 0)
                          }}
                          className="motion-interactive inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-[#6A594D] hover:bg-[#F7E8EB] hover:text-[#6E1F2F]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Checkout Form */}
          <form
            onSubmit={handleCheckout}
            noValidate
            className="space-y-3.5 border-t border-[#2B1D14]/10 bg-[#F6EFE6]/55 p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-[#5C4B40]">Total bayar</span>
              <span className="font-mono-tabular text-2xl font-semibold text-[#2B1D14]">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            <div
              role="group"
              aria-label="Metode pembayaran"
              className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#EFE6DA] p-1"
            >
              <button
                type="button"
                aria-pressed={paymentMethod === 'cash'}
                onClick={() => {
                  setPaymentMethod('cash')
                  setCheckoutError(null)
                }}
                className={`motion-pill inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] text-sm font-medium ${
                  paymentMethod === 'cash'
                    ? 'bg-[#0F2A24] text-[#F6EFE6]'
                    : 'text-[#5C4B40] hover:text-[#2B1D14]'
                }`}
              >
                <Banknote className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Tunai</span>
              </button>

              <button
                type="button"
                aria-pressed={paymentMethod === 'qris'}
                onClick={() => {
                  setPaymentMethod('qris')
                  setCheckoutError(null)
                }}
                className={`motion-pill inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] text-sm font-medium ${
                  paymentMethod === 'qris'
                    ? 'bg-[#0F2A24] text-[#F6EFE6]'
                    : 'text-[#5C4B40] hover:text-[#2B1D14]'
                }`}
              >
                <QrCode className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>QRIS</span>
              </button>
            </div>

            {paymentMethod === 'cash' ? (
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor={cashReceivedInputId}
                    className="block text-xs font-medium text-[#2B1D14]"
                  >
                    Uang diterima
                  </label>
                  <p id={cashReceivedHintId} className="mt-0.5 text-[11px] text-[#6A594D]">
                    Masukkan nominal tunai dari pelanggan untuk menghitung kembalian.
                  </p>
                  <CurrencyInput
                    id={cashReceivedInputId}
                    value={cashReceivedInput}
                    onValueChange={(digits) => setCashReceivedInput(digits)}
                    onBlur={() => setCashReceivedTouched(true)}
                    disabled={cart.length === 0}
                    aria-invalid={cashReceivedFieldError ? 'true' : 'false'}
                    aria-describedby={
                      cashReceivedFieldError
                        ? `${cashReceivedHintId} ${cashReceivedErrorId}`
                        : cashReceivedHintId
                    }
                    placeholder="Contoh: 50.000"
                    wrapperClassName="mt-1.5"
                  />
                  {cashReceivedFieldError ? (
                    <p
                      id={cashReceivedErrorId}
                      className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#6E1F2F]"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>{cashReceivedFieldError}</span>
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => {
                      setCashReceivedInput(String(Math.ceil(cartTotal)))
                      setCashReceivedTouched(true)
                    }}
                    className="motion-interactive inline-flex min-h-[44px] items-center rounded-[10px] border border-[#2B1D14]/15 bg-[#FFFDF9] px-3 text-xs font-medium text-[#2B1D14] hover:bg-[#EFE6DA] disabled:opacity-50"
                  >
                    Uang pas
                  </button>
                  {CASH_TENDER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={cart.length === 0}
                      onClick={() => {
                        setCashReceivedInput(String(preset))
                        setCashReceivedTouched(true)
                      }}
                      className="motion-interactive font-mono-tabular inline-flex min-h-[44px] items-center rounded-[10px] border border-[#2B1D14]/15 bg-[#FFFDF9] px-2.5 text-xs font-medium text-[#2B1D14] hover:bg-[#EFE6DA] disabled:opacity-50"
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>

                {cart.length > 0 && cashReceivedInput.trim() !== '' && Number.isFinite(parsedCashReceived) ? (
                  <div
                    className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-sm ${
                      parsedCashReceived >= cartTotal
                        ? 'border-[#14532D]/20 bg-[#EAF4EE] text-[#14532D]'
                        : 'border-[#6E1F2F]/20 bg-[#F7E8EB] text-[#6E1F2F]'
                    }`}
                  >
                    <span className="font-medium">
                      {parsedCashReceived >= cartTotal ? 'Kembalian' : 'Kurang'}
                    </span>
                    <span className="font-mono-tabular font-semibold">
                      {formatRupiah(parsedCashReceived >= cartTotal ? cashChange : cashShortfall)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[10px] border border-[#2B1D14]/12 bg-[#FFFDF9] px-3.5 py-2.5 text-xs leading-relaxed text-[#5C4B40]">
                Kode QRIS dinamis akan dibuat sesuai total{' '}
                <span className="font-mono-tabular font-semibold text-[#2B1D14]">
                  {formatRupiah(cartTotal)}
                </span>{' '}
                (Mode Sandbox). Status lunas menunggu konfirmasi payment gateway.
              </div>
            )}

            {checkoutError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[10px] border border-[#6E1F2F]/20 bg-[#F7E8EB] px-3 py-2.5 text-xs font-medium text-[#6E1F2F]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{checkoutError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                cart.length === 0 ||
                checkingOut ||
                (paymentMethod === 'cash' &&
                  (!Number.isFinite(parsedCashReceived) || parsedCashReceived < cartTotal))
              }
              className="motion-interactive inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#A8643A] px-5 text-base font-medium text-[#FFFDF9] hover:bg-[#92522B] disabled:opacity-50"
            >
              {checkingOut
                ? 'Memproses transaksi...'
                : paymentMethod === 'cash'
                  ? 'Konfirmasi bayar tunai'
                  : 'Buat QRIS pembayaran'}
            </button>
          </form>
        </aside>
      </div>

      <ReceiptModal
        open={receiptModalOpen}
        receipt={lastReceipt}
        userRole={user.role}
        onClose={() => {
          setReceiptModalOpen(false)
          window.setTimeout(() => searchInputRef.current?.focus(), 60)
        }}
        onReceiptUpdated={(updated) => setLastReceipt(updated)}
        onUnauthorized={onUnauthorized}
      />

      <CloseShiftModal
        open={closeShiftModalOpen}
        activeShift={activeShift}
        cashierName={user.name}
        onClose={() => setCloseShiftModalOpen(false)}
        onShiftClosed={() => {
          setCloseShiftModalOpen(false)
          updateShiftState(null)
          setCart([])
          setQtyDrafts({})
          setLastReceipt(null)
          setCashReceivedInput('')
          setCashReceivedTouched(false)
        }}
        onUnauthorized={onUnauthorized}
      />
    </div>
  )
}
