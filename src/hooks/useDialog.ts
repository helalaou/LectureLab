import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm button as destructive. */
  danger?: boolean
  /** Require the user to type this exact text before confirming. */
  requireText?: string
}

export interface PromptOptions {
  title: string
  message?: string
  label?: string
  placeholder?: string
  initialValue?: string
  confirmLabel?: string
}

export interface DialogApi {
  /** Resolves true when the user confirms. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Resolves the trimmed text, or null when cancelled or left empty. */
  prompt: (options: PromptOptions) => Promise<string | null>
}

export const DialogContext = createContext<DialogApi>({
  confirm: async () => false,
  prompt: async () => null,
})

/** In-app replacements for window.confirm / window.prompt. */
export const useDialog = () => useContext(DialogContext)
