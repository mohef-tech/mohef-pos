import type { InputHTMLAttributes } from 'react'
import {
  formatCurrencyDigits,
  parseCurrencyDigits,
  sanitizeCurrencyDigits,
} from '@/lib/format'

interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'value' | 'onChange'> {
  value: string
  onValueChange: (digits: string, numericValue: number) => void
  wrapperClassName?: string
}

export function CurrencyInput({
  value,
  onValueChange,
  wrapperClassName = '',
  className = '',
  disabled,
  ...rest
}: CurrencyInputProps) {
  const displayValue = formatCurrencyDigits(value)

  return (
    <div className={`relative ${wrapperClassName}`}>
      <span
        aria-hidden="true"
        className={`font-mono-tabular pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 select-none text-sm font-medium ${
          disabled ? 'text-[#6A594D]/55' : 'text-[#6A594D]'
        }`}
      >
        Rp
      </span>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={displayValue}
        onChange={(event) => {
          const cleanDigits = sanitizeCurrencyDigits(event.target.value)
          onValueChange(cleanDigits, parseCurrencyDigits(cleanDigits))
        }}
        className={`pos-input font-mono-tabular h-12 w-full rounded-[10px] border border-[#2B1D14]/22 bg-[#FFFDF9] pl-11 pr-3.5 text-base text-[#2B1D14] placeholder:text-[#6A594D]/70 disabled:opacity-55 ${className}`}
      />
    </div>
  )
}
