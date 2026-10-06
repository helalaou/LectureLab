import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type ShowToast = (message: string, kind?: ToastKind) => void

export const ToastContext = createContext<ShowToast>(() => {})

/** Shows a short, non-blocking notification at the bottom of the screen. */
export const useToast = () => useContext(ToastContext)
