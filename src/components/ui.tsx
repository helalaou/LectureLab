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

