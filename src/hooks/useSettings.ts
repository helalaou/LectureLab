import { createContext, useContext } from 'react'
import type { UserSettings } from '@/lib/types'

export interface SettingsState {
  settings: UserSettings
  update: (patch: Partial<UserSettings>) => Promise<void>
}

export const SettingsContext = createContext<SettingsState | null>(null)

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
