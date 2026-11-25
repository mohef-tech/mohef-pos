export const LOW_STOCK_THRESHOLD = 10

export type StockStatusLevel = 'out' | 'low' | 'ok'

export interface StockStatusInfo {
  level: StockStatusLevel
  label: string
}

const rupiahIntegerFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

const rupiahDecimalFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const stockNumberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
})

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rp 0'
  const isWhole = Math.abs(amount - Math.trunc(amount)) < 0.0001
  const formatted = isWhole
    ? rupiahIntegerFormatter.format(amount)
    : rupiahDecimalFormatter.format(amount)
  return `Rp ${formatted}`
}

export function formatStockNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const normalized = Math.abs(value) < 0.00005 ? 0 : value
  return stockNumberFormatter.format(normalized)
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return dateTimeFormatter.format(date)
}

export function getStockStatus(baseStock: number): StockStatusInfo {
  if (baseStock <= 0) {
    return { level: 'out', label: 'Habis' }
  }
  if (baseStock <= LOW_STOCK_THRESHOLD) {
    return { level: 'low', label: 'Menipis' }
  }
  return { level: 'ok', label: 'Aman' }
}

export function estimateVariantAvailability(baseStock: number, conversionRate: number): number {
  if (!Number.isFinite(baseStock) || !Number.isFinite(conversionRate) || conversionRate <= 0) {
    return 0
  }
  if (baseStock <= 0) return 0
  // Avoid floating-point floor drift on exact multiples (e.g. 3 / 0.1).
  return Math.floor(baseStock / conversionRate + 1e-9)
}

export function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim().replace(/\s+/g, '')
  if (trimmed === '') return Number.NaN
  const normalized = trimmed.replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number.NaN
  }
  return Number(normalized)
}

const MAX_CURRENCY_DIGITS = 12

export function sanitizeCurrencyDigits(raw: string): string {
  const digitsOnly = raw.replace(/\D+/g, '')
  if (digitsOnly === '') return ''
  const withoutLeadingZeros = digitsOnly.replace(/^0+(?=\d)/, '')
  return withoutLeadingZeros.slice(0, MAX_CURRENCY_DIGITS)
}

export function formatCurrencyDigits(raw: string): string {
  const digits = sanitizeCurrencyDigits(raw)
  if (digits === '') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseCurrencyDigits(raw: string): number {
  const digits = sanitizeCurrencyDigits(raw)
  if (digits === '') return Number.NaN
  return Number(digits)
}
