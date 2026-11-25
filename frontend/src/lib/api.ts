import type {
  AuthSession,
  HealthResponse,
  LoginPayload,
  LoginResponse,
  UserRole,
} from '@/types/auth'
import type {
  AdjustStockPayload,
  AdjustStockResponse,
  CreateProductPayload,
  Product,
} from '@/types/product'
import type {
  ActiveShiftState,
  CashierSession,
  CloseSessionPayload,
  CloseSessionResponse,
  CreateTransactionPayload,
  LogPrintReceiptResponse,
  OpenSessionPayload,
  Transaction,
} from '@/types/pos'

const AUTH_STORAGE_KEY = 'mohef_pos_auth_session'
const DEFAULT_API_BASE_URL = 'http://localhost:8080'

export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  withAuth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, withAuth = false, headers: customHeaders, ...rest } = options
  const headers = new Headers(customHeaders)

  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (withAuth) {
    const session = getStoredAuthSession()
    if (session?.token) {
      headers.set('Authorization', `Bearer ${session.token}`)
    }
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.', 0)
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const serverMessage =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Permintaan gagal dengan kode ${response.status}`
    throw new ApiError(serverMessage, response.status)
  }

  return data as T
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (
      typeof parsed?.token === 'string' &&
      parsed.token.length > 0 &&
      parsed.user &&
      typeof parsed.user.id === 'number' &&
      (parsed.user.role === 'owner' || parsed.user.role === 'cashier')
    ) {
      return { token: parsed.token, user: parsed.user }
    }
    return null
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export async function checkBackendHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', {
    method: 'GET',
    signal,
  })
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export interface SmartLoginResult {
  session: AuthSession
  resolvedRole: UserRole
  usedFallback: boolean
}

function buildLoginPayload(role: UserRole, identifier: string, secret: string): LoginPayload {
  const trimmedIdentifier = identifier.trim()
  if (role === 'owner') {
    return {
      role: 'owner',
      email: trimmedIdentifier,
      password: secret,
    }
  }
  return {
    role: 'cashier',
    username: trimmedIdentifier,
    pin: secret,
  }
}

// Retry once against the opposite role on 401 when the identifier format matches that role.
export async function loginWithSmartFallback(
  activeRole: UserRole,
  identifier: string,
  secret: string,
): Promise<SmartLoginResult> {
  const trimmedIdentifier = identifier.trim()
  const primaryPayload = buildLoginPayload(activeRole, trimmedIdentifier, secret)

  try {
    const response = await loginRequest(primaryPayload)
    return {
      session: { token: response.token, user: response.user },
      resolvedRole: activeRole,
      usedFallback: false,
    }
  } catch (error) {
    const shouldTryOwnerFallback =
      error instanceof ApiError &&
      error.status === 401 &&
      activeRole === 'cashier' &&
      trimmedIdentifier.includes('@')

    const shouldTryCashierFallback =
      error instanceof ApiError &&
      error.status === 401 &&
      activeRole === 'owner' &&
      !trimmedIdentifier.includes('@')

    if (!shouldTryOwnerFallback && !shouldTryCashierFallback) {
      throw error
    }

    const fallbackRole: UserRole = shouldTryOwnerFallback ? 'owner' : 'cashier'
    const fallbackPayload = buildLoginPayload(fallbackRole, trimmedIdentifier, secret)

    try {
      const response = await loginRequest(fallbackPayload)
      return {
        session: { token: response.token, user: response.user },
        resolvedRole: fallbackRole,
        usedFallback: true,
      }
    } catch {
      // Preserve the primary error if the fallback attempt also fails.
      throw error
    }
  }
}

interface DataResponse<T> {
  data: T
}

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const response = await apiRequest<DataResponse<Product[] | null>>('/api/products', {
    method: 'GET',
    withAuth: true,
    signal,
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const response = await apiRequest<DataResponse<Product>>('/api/products', {
    method: 'POST',
    withAuth: true,
    body: payload,
  })
  return response.data
}

export async function adjustProductStock(
  payload: AdjustStockPayload,
): Promise<AdjustStockResponse> {
  return apiRequest<AdjustStockResponse>('/api/products/adjust-stock', {
    method: 'POST',
    withAuth: true,
    body: payload,
  })
}

export async function openCashierSession(payload: OpenSessionPayload): Promise<CashierSession> {
  const response = await apiRequest<DataResponse<CashierSession>>('/api/sessions/open', {
    method: 'POST',
    withAuth: true,
    body: payload,
  })
  return response.data
}

export async function closeCashierSession(
  payload: CloseSessionPayload,
): Promise<CloseSessionResponse> {
  return apiRequest<CloseSessionResponse>('/api/sessions/close', {
    method: 'POST',
    withAuth: true,
    body: payload,
  })
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  const response = await apiRequest<DataResponse<Transaction>>('/api/transactions', {
    method: 'POST',
    withAuth: true,
    body: payload,
  })
  return response.data
}

export async function logPrintReceipt(transactionId: number): Promise<LogPrintReceiptResponse> {
  return apiRequest<LogPrintReceiptResponse>('/api/audits/print', {
    method: 'POST',
    withAuth: true,
    body: { transaction_id: transactionId },
  })
}

function getShiftStorageKey(businessId: number, userId: number): string {
  return `mohef_pos_active_shift_${businessId}_${userId}`
}

export function getStoredActiveShift(businessId: number, userId: number): ActiveShiftState | null {
  try {
    const raw = window.localStorage.getItem(getShiftStorageKey(businessId, userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ActiveShiftState>
    if (
      parsed?.session &&
      parsed.session.status === 'open' &&
      typeof parsed.session.starting_cash === 'number'
    ) {
      return {
        session: parsed.session,
        resumedFromServer: Boolean(parsed.resumedFromServer),
        localCashSales: typeof parsed.localCashSales === 'number' ? parsed.localCashSales : 0,
        localQrisSales: typeof parsed.localQrisSales === 'number' ? parsed.localQrisSales : 0,
        transactionCount:
          typeof parsed.transactionCount === 'number' ? parsed.transactionCount : 0,
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveActiveShift(
  businessId: number,
  userId: number,
  state: ActiveShiftState,
): void {
  window.localStorage.setItem(getShiftStorageKey(businessId, userId), JSON.stringify(state))
}

export function clearActiveShift(businessId: number, userId: number): void {
  window.localStorage.removeItem(getShiftStorageKey(businessId, userId))
}
