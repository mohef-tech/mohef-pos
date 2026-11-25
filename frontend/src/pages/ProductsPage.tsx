import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Package,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react'
import { AddProductModal } from '@/components/AddProductModal'
import { AdjustStockModal } from '@/components/AdjustStockModal'
import { ApiError, fetchProducts } from '@/lib/api'
import {
  LOW_STOCK_THRESHOLD,
  estimateVariantAvailability,
  formatRupiah,
  formatStockNumber,
  formatTimestamp,
  getStockStatus,
  type StockStatusLevel,
} from '@/lib/format'
import type { AdjustStockResponse, Product } from '@/types/product'

type StockFilter = 'all' | 'low' | 'out'

interface ProductsPageProps {
  onUnauthorized: () => void
}

interface RecentNotice {
  productId: number
  message: string
}

function StockStatusBadge({ level, label }: { level: StockStatusLevel; label: string }) {
  if (level === 'out') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F7E8EB] px-2 py-0.5 text-xs font-medium text-[#6E1F2F]">
        <XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span>{label}</span>
      </span>
    )
  }

  if (level === 'low') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#FBF1DF] px-2 py-0.5 text-xs font-medium text-[#7C4A15]">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#E8F3EC] px-2 py-0.5 text-xs font-medium text-[#14532D]">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

function summarizeVariants(product: Product): string {
  const variants = product.variants ?? []
  if (variants.length === 0) return 'Belum ada kemasan'
  const names = variants.map((v) => v.variant_name)
  const preview = names.slice(0, 2).join(', ')
  const extra = names.length > 2 ? ` +${names.length - 2} lainnya` : ''
  return `${variants.length} kemasan: ${preview}${extra}`
}

export function ProductsPage({ onUnauthorized }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [recentNotice, setRecentNotice] = useState<RecentNotice | null>(null)

  const searchInputId = useId()
  const detailPanelRef = useRef<HTMLElement>(null)

  const loadProducts = useCallback(
    async (options: { silent?: boolean; signal?: AbortSignal } = {}) => {
      if (options.silent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setFetchError(null)

      try {
        const list = await fetchProducts(options.signal)
        if (options.signal?.aborted) return
        setProducts(list)
        setSelectedProductId((current) => {
          if (current !== null && list.some((p) => p.id === current)) {
            return current
          }
          return list.length > 0 ? list[0].id : null
        })
      } catch (error) {
        if (options.signal?.aborted) return
        if (error instanceof ApiError) {
          if (error.status === 401) {
            onUnauthorized()
            return
          }
          setFetchError(error.message)
        } else {
          setFetchError('Gagal memuat daftar produk dari server.')
        }
      } finally {
        if (!options.signal?.aborted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [onUnauthorized],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setProducts(list)
        setFetchError(null)
        setSelectedProductId((current) => {
          if (current !== null && list.some((p) => p.id === current)) {
            return current
          }
          return list.length > 0 ? list[0].id : null
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError) {
          if (error.status === 401) {
            onUnauthorized()
            return
          }
          setFetchError(error.message)
        } else {
          setFetchError('Gagal memuat daftar produk dari server.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [onUnauthorized])

  const metrics = useMemo(() => {
    let lowCount = 0
    let outCount = 0
    for (const product of products) {
      if (product.base_stock <= 0) {
        outCount += 1
      } else if (product.base_stock <= LOW_STOCK_THRESHOLD) {
        lowCount += 1
      }
    }
    return {
      total: products.length,
      low: lowCount,
      out: outCount,
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return products.filter((product) => {
      if (stockFilter === 'out' && product.base_stock > 0) return false
      if (
        stockFilter === 'low' &&
        (product.base_stock <= 0 || product.base_stock > LOW_STOCK_THRESHOLD)
      ) {
        return false
      }

      if (normalizedQuery.length === 0) return true

      if (product.name.toLowerCase().includes(normalizedQuery)) return true
      const variants = product.variants ?? []
      return variants.some(
        (variant) =>
          variant.variant_name.toLowerCase().includes(normalizedQuery) ||
          variant.barcode.toLowerCase().includes(normalizedQuery),
      )
    })
  }, [products, searchQuery, stockFilter])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  )

  const handleSelectProduct = (productId: number) => {
    setSelectedProductId(productId)
    if (window.innerWidth < 1024) {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleProductCreated = (created: Product) => {
    setProducts((prev) => [...prev, created])
    setSelectedProductId(created.id)
    setSearchQuery('')
    setStockFilter('all')
    setIsAddModalOpen(false)
    setRecentNotice({
      productId: created.id,
      message: `Produk "${created.name}" berhasil ditambahkan dengan stok awal ${formatStockNumber(created.base_stock)}.`,
    })
  }

  const handleStockAdjusted = (response: AdjustStockResponse) => {
    const updatedProduct = response.product
    const movement = response.movement

    setProducts((prev) =>
      prev.map((item) =>
        item.id === updatedProduct.id
          ? {
              ...item,
              base_stock: updatedProduct.base_stock,
              updated_at: updatedProduct.updated_at,
            }
          : item,
      ),
    )
    setAdjustingProduct(null)

    const deltaSign = movement.quantity >= 0 ? '+' : ''
    setRecentNotice({
      productId: updatedProduct.id,
      message: `Stok diperbarui (${deltaSign}${formatStockNumber(movement.quantity)}). Alasan: ${movement.reason}`,
    })
  }

  const hasActiveFilter = searchQuery.trim().length > 0 || stockFilter !== 'all'

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:py-6">
      <section className="flex flex-col gap-4 border-b border-[#2B1D14]/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#2B1D14]">
              Produk & Stok
            </h1>
            <p className="mt-1 text-sm text-[#5C4B40]">
              Kelola daftar barang, rasio kemasan jual, dan penyesuaian stok dasar toko.
            </p>
          </div>

          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-2">
              <dt className="text-xs font-medium text-[#5C4B40]">Total produk</dt>
              <dd className="font-mono-tabular text-base font-medium text-[#2B1D14]">
                {metrics.total}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs font-medium text-[#7C4A15]">Stok menipis</dt>
              <dd className="font-mono-tabular text-base font-medium text-[#7C4A15]">
                {metrics.low}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="text-xs font-medium text-[#6E1F2F]">Stok habis</dt>
              <dd className="font-mono-tabular text-base font-medium text-[#6E1F2F]">
                {metrics.out}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadProducts({ silent: true })}
            disabled={isLoading || isRefreshing}
            aria-label="Muat ulang daftar produk"
            className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-3.5 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Muat ulang</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Tambah produk</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section
          aria-label="Daftar produk"
          className="overflow-hidden rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9]"
        >
          <div className="space-y-3 border-b border-[#2B1D14]/10 bg-[#EFE6DA]/45 p-4">
            <div>
              <label htmlFor={searchInputId} className="block text-xs font-medium text-[#5C4B40]">
                Cari nama produk, kemasan, atau barcode
              </label>
              <div className="relative mt-1.5">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A594D]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <input
                  id={searchInputId}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama barang atau scan barcode..."
                  className="pos-input h-11 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] pl-10 pr-11 text-sm text-[#2B1D14] placeholder:text-[#6A594D]"
                />
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus kata pencarian"
                    className="motion-interactive absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-r-[10px] text-[#5C4B40] hover:text-[#2B1D14]"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter status stok">
              {(
                [
                  { id: 'all', label: 'Semua', count: metrics.total },
                  { id: 'low', label: 'Stok menipis', count: metrics.low },
                  { id: 'out', label: 'Habis', count: metrics.out },
                ] as const
              ).map((chip) => {
                const isActive = stockFilter === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStockFilter(chip.id)}
                    aria-pressed={isActive}
                    className={`motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 text-sm font-medium ${
                      isActive
                        ? 'border-[#0F2A24] bg-[#0F2A24] text-[#F6EFE6]'
                        : 'border-[#2B1D14]/15 bg-[#FFFDF9] text-[#2B1D14] hover:bg-[#EFE6DA]'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`font-mono-tabular text-xs ${
                        isActive ? 'text-[#D8C28A]' : 'text-[#6A594D]'
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {isLoading ? (
            <div aria-busy="true" aria-label="Memuat daftar produk" className="divide-y divide-[#2B1D14]/10">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="flex min-h-[68px] items-center justify-between gap-4 px-4 py-3.5">
                  <div className="space-y-2">
                    <div className="h-4 w-44 rounded-[6px] bg-[#EFE6DA]" />
                    <div className="h-3 w-32 rounded-[6px] bg-[#EFE6DA]/70" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-14 rounded-[6px] bg-[#EFE6DA]" />
                    <div className="h-5 w-16 rounded-[6px] bg-[#EFE6DA]/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#F7E8EB] text-[#6E1F2F]">
                <AlertCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#2B1D14]">
                Daftar produk gagal dimuat
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#5C4B40]">{fetchError}</p>
              <button
                type="button"
                onClick={() => void loadProducts()}
                className="motion-interactive mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Muat ulang</span>
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#EFE6DA] text-[#5C4B40]">
                <PackageOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#2B1D14]">Belum ada produk</h2>
              <p className="mt-1 max-w-sm text-sm text-[#5C4B40]">
                Tambahkan barang pertama beserta kemasan jualnya agar siap digunakan di layar kasir.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="motion-interactive mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#0F2A24] px-4 text-sm font-medium text-[#F6EFE6] hover:bg-[#173B32]"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                <span>Tambah produk pertama</span>
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#EFE6DA] text-[#5C4B40]">
                <Search className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#2B1D14]">
                Tidak ada produk yang cocok
              </h2>
              <p className="mt-1 max-w-sm text-sm text-[#5C4B40]">
                Coba ubah kata kunci pencarian atau pilih filter stok lainnya.
              </p>
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setStockFilter('all')
                  }}
                  className="motion-interactive mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[#2B1D14]/20 bg-[#FFFDF9] px-4 text-sm font-medium text-[#2B1D14] hover:bg-[#EFE6DA]"
                >
                  <span>Reset filter</span>
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-[#2B1D14]/10" aria-label="Hasil daftar produk">
              {filteredProducts.map((product) => {
                const isSelected = product.id === selectedProductId
                const status = getStockStatus(product.base_stock)

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(product.id)}
                      aria-pressed={isSelected}
                      className={`motion-interactive flex min-h-[68px] w-full items-center justify-between gap-4 border-l-[3px] px-4 py-3.5 text-left ${
                        isSelected
                          ? 'border-l-[#A8643A] bg-[#EFE6DA]'
                          : 'border-l-transparent bg-[#FFFDF9] hover:bg-[#F6EFE6]/75'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2B1D14]">
                          {product.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#5C4B40]">
                          {summarizeVariants(product)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <div className="text-right">
                          <span className="font-mono-tabular text-sm font-medium text-[#2B1D14]">
                            {formatStockNumber(product.base_stock)}
                          </span>
                          <span className="ml-1 text-xs text-[#6A594D]">dasar</span>
                        </div>
                        <StockStatusBadge level={status.level} label={status.label} />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside
          ref={detailPanelRef}
          aria-label="Detail produk terpilih"
          className="rounded-[14px] border border-[#2B1D14]/10 bg-[#FFFDF9] p-5 lg:sticky lg:top-[76px]"
        >
          {!selectedProduct ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#EFE6DA] text-[#5C4B40]">
                <Package className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#2B1D14]">
                Pilih produk untuk melihat detail
              </h2>
              <p className="mt-1 max-w-xs text-sm text-[#5C4B40]">
                Klik salah satu barang di daftar sebelah kiri untuk memeriksa varian kemasan atau
                menyesuaikan stok dasar.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-[#2B1D14]/10 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#2B1D14]">
                      {selectedProduct.name}
                    </h2>
                    <p className="font-mono-tabular mt-1 text-xs text-[#6A594D]">
                      ID #{selectedProduct.id}
                      {selectedProduct.updated_at
                        ? ` · Diperbarui ${formatTimestamp(selectedProduct.updated_at)}`
                        : ''}
                    </p>
                  </div>
                </div>

                {recentNotice && recentNotice.productId === selectedProduct.id ? (
                  <div
                    role="status"
                    className="mt-3 flex items-start justify-between gap-2 rounded-[10px] border border-[#14532D]/20 bg-[#E8F3EC] px-3 py-2.5 text-xs text-[#14532D]"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>{recentNotice.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecentNotice(null)}
                      aria-label="Tutup pemberitahuan"
                      className="motion-interactive -my-2 -mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#14532D] hover:bg-[#14532D]/10"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[12px] border border-[#2B1D14]/10 bg-[#F6EFE6] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#5C4B40]">Stok dasar tersedia</p>
                    <div className="mt-1 flex items-center gap-2.5">
                      <span className="font-mono-tabular text-3xl font-medium tracking-[-0.02em] text-[#2B1D14]">
                        {formatStockNumber(selectedProduct.base_stock)}
                      </span>
                      <StockStatusBadge
                        level={getStockStatus(selectedProduct.base_stock).level}
                        label={getStockStatus(selectedProduct.base_stock).label}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdjustingProduct(selectedProduct)}
                    className="motion-interactive inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-[#A8643A] px-4 text-sm font-medium text-[#FFFDF9] hover:bg-[#92522B]"
                  >
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>Sesuaikan stok</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#2B1D14]">Varian kemasan jual</h3>
                  <span className="font-mono-tabular text-xs text-[#6A594D]">
                    {(selectedProduct.variants ?? []).length} kemasan
                  </span>
                </div>

                {(selectedProduct.variants ?? []).length === 0 ? (
                  <p className="rounded-[10px] border border-[#2B1D14]/10 bg-[#F6EFE6]/50 px-3.5 py-3 text-sm text-[#5C4B40]">
                    Produk ini belum memiliki varian kemasan jual.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {(selectedProduct.variants ?? []).map((variant) => {
                      const availableCount = estimateVariantAvailability(
                        selectedProduct.base_stock,
                        variant.conversion_rate,
                      )
                      return (
                        <li
                          key={variant.id}
                          className="rounded-[10px] border border-[#2B1D14]/10 bg-[#F6EFE6]/55 p-3.5"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-medium text-[#2B1D14]">
                              {variant.variant_name}
                            </p>
                            <p className="font-mono-tabular shrink-0 text-sm font-medium text-[#2B1D14]">
                              {formatRupiah(variant.price)}
                            </p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-[#5C4B40]">
                              Memotong{' '}
                              <strong className="font-mono-tabular font-medium text-[#2B1D14]">
                                {formatStockNumber(variant.conversion_rate)}
                              </strong>{' '}
                              satuan dasar
                            </span>

                            <span
                              className={`font-mono-tabular font-medium ${
                                availableCount > 0 ? 'text-[#14532D]' : 'text-[#6E1F2F]'
                              }`}
                            >
                              {availableCount > 0
                                ? `Tersedia ~${formatStockNumber(availableCount)} ${variant.variant_name}`
                                : 'Stok belum mencukupi'}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 border-t border-[#2B1D14]/8 pt-2 text-xs text-[#6A594D]">
                            <Barcode className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                            {variant.barcode ? (
                              <span className="font-mono-tabular text-[#5C4B40]">
                                {variant.barcode}
                              </span>
                            ) : (
                              <span>Tanpa barcode</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <AddProductModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleProductCreated}
        onUnauthorized={onUnauthorized}
      />

      <AdjustStockModal
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        onAdjusted={handleStockAdjusted}
        onUnauthorized={onUnauthorized}
      />
    </div>
  )
}
