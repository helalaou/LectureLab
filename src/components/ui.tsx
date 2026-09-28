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

export function Badge({ children, tone = 'zinc', className }: { children: ReactNode; tone?: 'zinc' | 'accent' | 'green' | 'amber' | 'red'; className?: string }) {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  }
  return <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800', className)}>
      <div className="h-full rounded-full bg-accent-600 transition-[width] duration-500" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  )
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="muted mt-1.5 max-w-sm text-[15px]">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="muted block text-sm">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-accent-600' : 'bg-zinc-300 dark:bg-zinc-700')}
      >
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex w-full rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
            value === o.value ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ Modal / bottom sheet

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/90 px-5 pt-4 pb-2 backdrop-blur dark:bg-zinc-900/90">
          <div className="mx-auto h-1 w-10 rounded-full bg-zinc-300 sm:hidden dark:bg-zinc-700" style={{ position: 'absolute', top: 8, left: 0, right: 0 }} />
          <h2 className="pt-2 text-lg font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="px-5 pt-2 pb-6 pb-safe">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

