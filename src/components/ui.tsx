import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export { clsx as cx }

// ------------------------------------------------------------------ Button

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-sm shadow-accent-600/20',
  secondary:
    'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
  soft: 'bg-accent-50 text-accent-700 hover:bg-accent-100 dark:bg-accent-950/50 dark:text-accent-300 dark:hover:bg-accent-900/50',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
}
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-[15px] gap-2 rounded-xl',
  lg: 'h-14 px-6 text-base gap-2.5 rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={clsx(
        'inline-flex size-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------------ Misc

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('size-5 animate-spin text-accent-600', className)} />
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  )
}

