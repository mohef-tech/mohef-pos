export type SessionStatus = 'open' | 'closed'

export interface CashierSession {
  id: number
  business_id: number
  user_id: number
  start_time: string
  end_time: string | null
  starting_cash: number
  expected_cash: number
  actual_cash: number
  status: SessionStatus
}

export interface OpenSessionPayload {
  starting_cash: number
}

export interface CloseSessionPayload {
  session_id?: number
  actual_cash: number
}

export interface CloseSessionSummary {
  starting_cash: number
  cash_sales: number
  qris_sales: number
  total_refunds: number
  expected_cash: number
  actual_cash: number
  difference: number
}

export interface CloseSessionResponse {
  data: CashierSession
  summary: CloseSessionSummary
}

export type PaymentMethod = 'cash' | 'qris'
export type TransactionStatus = 'paid' | 'pending' | 'refunded'

export interface TransactionItemPayload {
  product_variant_id: number
  quantity: number
}

export interface CreateTransactionPayload {
  session_id?: number
  payment_method: PaymentMethod
  items: TransactionItemPayload[]
}

export interface TransactionItem {
  id: number
  transaction_id: number
  product_variant_id: number
  quantity: number
  price_at_time: number
  subtotal: number
}

export interface Transaction {
  id: number
  business_id: number
  session_id: number
  receipt_number: string
  total_amount: number
  payment_method: PaymentMethod
  status: TransactionStatus
  items?: TransactionItem[]
  created_at: string
}

export interface PrintAudit {
  id: number
  business_id: number
  transaction_id: number
  user_id: number
  print_sequence: number
  is_copy: boolean
  printed_at: string
}

export interface LogPrintReceiptResponse {
  data: PrintAudit
  watermark: string
}

export interface ActiveShiftState {
  session: CashierSession
  resumedFromServer: boolean
  localCashSales: number
  localQrisSales: number
  transactionCount: number
}

export interface CartItem {
  variantId: number
  productId: number
  productName: string
  variantName: string
  conversionRate: number
  price: number
  barcode: string
  quantity: number
}

export interface ReceiptItemSnapshot {
  variantId: number
  productName: string
  variantName: string
  quantity: number
  priceAtTime: number
  subtotal: number
}

export interface ReceiptSnapshot {
  transaction: Transaction
  items: ReceiptItemSnapshot[]
  cashierName: string
  cashReceived: number | null
  changeAmount: number | null
  printSequence: number
  watermark: string
}
