import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { ToastContext, type ToastKind } from '@/hooks/useToast'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const DURATION_MS: Record<ToastKind, number> = { success: 3500, info: 3500, error: 7000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++nextId.current
    setItems((list) => [...list, { id, kind, message }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), DURATION_MS[kind])
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        >
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t.kind === 'success' && (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400 dark:text-emerald-600" />
              )}
              {t.kind === 'error' && <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400 dark:text-red-600" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
