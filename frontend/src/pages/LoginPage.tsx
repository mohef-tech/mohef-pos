import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  UserRound,
  WifiOff,
} from 'lucide-react'
import { ApiError, checkBackendHealth, loginWithSmartFallback } from '@/lib/api'
import type { AuthSession, UserRole } from '@/types/auth'

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void
}

type ServerStatus = 'checking' | 'online' | 'offline'

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [activeRole, setActiveRole] = useState<UserRole>('cashier')
  const [identifier, setIdentifier] = useState('')
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [touched, setTouched] = useState({ identifier: false, secret: false })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking')

  const identifierRef = useRef<HTMLInputElement>(null)
  const secretRef = useRef<HTMLInputElement>(null)

  const identifierErrorId = useId()
  const secretErrorId = useId()
  const formAlertId = useId()

  const handleRetryHealthCheck = useCallback(async () => {
    setServerStatus('checking')
    try {
      const result = await checkBackendHealth()
      setServerStatus(result.status === 'ok' ? 'online' : 'offline')
    } catch {
      setServerStatus('offline')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    checkBackendHealth(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setServerStatus(result.status === 'ok' ? 'online' : 'offline')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setServerStatus('offline')
        }
      })
    return () => controller.abort()
  }, [])

  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === activeRole) return
    setActiveRole(nextRole)
    setAutoSwitchNotice(null)
    setErrorMessage(null)
    setShowSecret(false)
  }

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value)
    if (errorMessage) setErrorMessage(null)

    if (activeRole === 'cashier' && value.includes('@')) {
      setActiveRole('owner')
      setAutoSwitchNotice('Format email terdeteksi, tab dialihkan ke Pemilik.')
    } else if (autoSwitchNotice && !value.includes('@')) {
      setAutoSwitchNotice(null)
    }
  }

  const identifierInvalid = (touched.identifier || hasSubmitted) && identifier.trim().length === 0
  const secretInvalid = (touched.secret || hasSubmitted) && secret.length === 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)
    setErrorMessage(null)

    if (identifier.trim().length === 0) {
      identifierRef.current?.focus()
      return
    }
    if (secret.length === 0) {
      secretRef.current?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      const result = await loginWithSmartFallback(activeRole, identifier, secret)
      onLoginSuccess(result.session)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Terjadi kesalahan saat masuk. Silakan coba lagi.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCashier = activeRole === 'cashier'

  return (
    <div className="surface-dark relative min-h-dvh w-full overflow-hidden bg-[#0B201B] text-[#F6EFE6] flex flex-col justify-between">
      {/* Latar A: Sculpted Warm Horizon (W1 Forest & Copper palette only) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(155deg, #0B201B 0%, #0F2A24 52%, #13332B 100%)',
          }}
        />
        <div
          className="absolute -bottom-32 -right-24 h-[520px] w-[620px] rounded-full opacity-35"
          style={{
            background:
              'radial-gradient(circle, rgba(168, 100, 58, 0.55) 0%, rgba(168, 100, 58, 0.14) 48%, rgba(15, 42, 36, 0) 74%)',
          }}
        />
        <div
          className="absolute -top-40 -left-24 h-[440px] w-[520px] rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle, rgba(23, 59, 50, 0.9) 0%, rgba(15, 42, 36, 0) 72%)',
          }}
        />
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d="M0 640 C 320 560, 620 710, 980 620 C 1180 570, 1340 530, 1440 555 L 1440 900 L 0 900 Z"
            fill="#173B32"
            fillOpacity="0.48"
          />
          <path
            d="M0 735 C 380 675, 760 795, 1140 705 C 1280 672, 1380 658, 1440 668 L 1440 900 L 0 900 Z"
            fill="#0F2A24"
            fillOpacity="0.72"
          />
          <path
            d="M0 640 C 320 560, 620 710, 980 620 C 1180 570, 1340 530, 1440 555"
            fill="none"
            stroke="#D8C28A"
            strokeOpacity="0.16"
            strokeWidth="1.25"
          />
          <path
            d="M0 735 C 380 675, 760 795, 1140 705 C 1280 672, 1380 658, 1440 668"
            fill="none"
            stroke="#A8643A"
            strokeOpacity="0.28"
            strokeWidth="1.25"
          />
        </svg>
      </div>

      {/* Main Centered Floating Glass Console */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <section
          aria-labelledby="login-heading"
          className="login-glass-console w-full max-w-[440px] rounded-[20px] p-6 sm:p-8"
        >
          <header className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#D8C28A]/25 bg-[#173B32] text-[#D8C28A]">
              <Store className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <h1
                id="login-heading"
                className="text-xl font-semibold leading-tight tracking-[-0.01em] text-[#F6EFE6]"
              >
                Mohef POS
              </h1>
              <p className="mt-0.5 text-sm text-[#B4C6BF]">
                Masuk ke ruang kasir atau kelola toko
              </p>
            </div>
          </header>

          {/* Smart Segmented Pill Toggle */}
          <div
            role="tablist"
            aria-label="Pilih peran masuk"
            className="relative mb-6 grid grid-cols-2 rounded-full border border-[#D8C28A]/20 bg-[#0B201B]/80 p-1"
          >
            <span
              aria-hidden="true"
              className={`motion-pill pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#F6EFE6] shadow-sm ${
                isCashier ? 'translate-x-0' : 'translate-x-full'
              }`}
            />
            <button
              type="button"
              role="tab"
              aria-selected={isCashier}
              onClick={() => handleRoleChange('cashier')}
              className={`motion-pill relative z-10 flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-medium ${
                isCashier ? 'text-[#0F2A24]' : 'text-[#B4C6BF] hover:text-[#F6EFE6]'
              }`}
            >
              <UserRound className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Kasir</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isCashier}
              onClick={() => handleRoleChange('owner')}
              className={`motion-pill relative z-10 flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-medium ${
                !isCashier ? 'text-[#0F2A24]' : 'text-[#B4C6BF] hover:text-[#F6EFE6]'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>Pemilik</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errorMessage && (
              <div
                id={formAlertId}
                role="alert"
                className="flex items-start gap-2.5 rounded-[10px] border border-[#6E1F2F]/25 bg-[#F7E8EB] px-3.5 py-3 text-sm text-[#6E1F2F]"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>{errorMessage}</span>
              </div>
            )}

            {autoSwitchNotice && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-[10px] border border-[#D8C28A]/30 bg-[#173B32]/85 px-3.5 py-2.5 text-xs text-[#D8C28A]"
              >
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>{autoSwitchNotice}</span>
              </div>
            )}

            {/* Field 1: Username kasir or Email pemilik */}
            <div>
              <label
                htmlFor="login-identifier"
                className="mb-1.5 block text-sm font-medium text-[#F6EFE6]"
              >
                {isCashier ? 'Username kasir' : 'Email pemilik'}
              </label>
              <input
                ref={identifierRef}
                id="login-identifier"
                name={isCashier ? 'username' : 'email'}
                type={isCashier ? 'text' : 'email'}
                inputMode={isCashier ? 'text' : 'email'}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                required
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
                aria-invalid={identifierInvalid ? 'true' : 'false'}
                aria-describedby={identifierInvalid ? identifierErrorId : undefined}
                placeholder={isCashier ? 'Contoh: kasir1' : 'Contoh: pemilik@toko.id'}
                className="login-input h-12 w-full rounded-[10px] border border-[#D8C28A]/28 bg-[#0B201B]/70 px-3.5 text-base text-[#F6EFE6] placeholder:text-[#B4C6BF]/70 focus:border-[#D8C28A]"
              />
              {identifierInvalid && (
                <p
                  id={identifierErrorId}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-[#F7C7CF]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {isCashier
                      ? 'Username kasir wajib diisi.'
                      : 'Email pemilik wajib diisi.'}
                  </span>
                </p>
              )}
            </div>

            {/* Field 2: PIN (numeric native keypad) or Kata sandi */}
            <div>
              <label
                htmlFor="login-secret"
                className="mb-1.5 block text-sm font-medium text-[#F6EFE6]"
              >
                {isCashier ? 'PIN' : 'Kata sandi'}
              </label>
              <div className="relative">
                <input
                  ref={secretRef}
                  id="login-secret"
                  name={isCashier ? 'pin' : 'password'}
                  type={showSecret ? 'text' : 'password'}
                  inputMode={isCashier ? 'numeric' : 'text'}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  value={secret}
                  onChange={(e) => {
                    setSecret(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, secret: true }))}
                  aria-invalid={secretInvalid ? 'true' : 'false'}
                  aria-describedby={secretInvalid ? secretErrorId : undefined}
                  placeholder={isCashier ? 'Masukkan PIN kasir' : 'Masukkan kata sandi'}
                  className={`login-input h-12 w-full rounded-[10px] border border-[#D8C28A]/28 bg-[#0B201B]/70 pr-12 pl-3.5 text-base text-[#F6EFE6] placeholder:text-[#B4C6BF]/70 focus:border-[#D8C28A] ${
                    isCashier ? 'font-mono-tabular tracking-[0.12em]' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((prev) => !prev)}
                  aria-label={
                    isCashier
                      ? showSecret
                        ? 'Sembunyikan PIN'
                        : 'Tampilkan PIN'
                      : showSecret
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                  }
                  aria-pressed={showSecret}
                  className="motion-interactive absolute top-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-[8px] text-[#B4C6BF] hover:bg-[#173B32] hover:text-[#F6EFE6]"
                >
                  {showSecret ? (
                    <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  )}
                </button>
              </div>
              {secretInvalid && (
                <p
                  id={secretErrorId}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-[#F7C7CF]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span>{isCashier ? 'PIN kasir wajib diisi.' : 'Kata sandi wajib diisi.'}</span>
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="motion-interactive flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#A8643A] px-4 text-base font-medium text-[#FFFDF9] hover:bg-[#92522B] active:translate-y-px disabled:opacity-65"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
                    <span>Memeriksa akun...</span>
                  </>
                ) : (
                  <span>Masuk</span>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Footer: Backend Health Status Indicator (GET /health) */}
      <footer className="relative z-10 flex items-center justify-between px-4 pb-4 sm:px-6 sm:pb-6">
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8C28A]/18 bg-[#0B201B]/75 px-3 py-1.5 text-xs"
        >
          {serverStatus === 'checking' && (
            <>
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-[#B4C6BF]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="text-[#B4C6BF]">Memeriksa server...</span>
            </>
          )}

          {serverStatus === 'online' && (
            <>
              <CheckCircle2
                className="h-3.5 w-3.5 text-[#86EFAC]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="text-[#F6EFE6]">Server siap</span>
            </>
          )}

          {serverStatus === 'offline' && (
            <>
              <WifiOff
                className="h-3.5 w-3.5 text-[#F7C7CF]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="text-[#F7C7CF]">Koneksi terputus</span>
              <button
                type="button"
                onClick={() => void handleRetryHealthCheck()}
                className="motion-interactive ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#173B32] px-3.5 text-xs font-medium text-[#F6EFE6] hover:bg-[#A8643A]"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span>Coba lagi</span>
              </button>
            </>
          )}
        </div>

        <span className="font-mono-tabular text-xs text-[#B4C6BF]/80">V1</span>
      </footer>
    </div>
  )
}
