export type UserRole = 'owner' | 'cashier'

export interface AuthUser {
  id: number
  business_id: number
  name: string
  email?: string
  username?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export type LoginPayload =
  | {
      role: 'owner'
      email: string
      password: string
    }
  | {
      role: 'cashier'
      username: string
      pin: string
    }

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export interface HealthResponse {
  status: 'ok' | 'error'
  database: string
}
