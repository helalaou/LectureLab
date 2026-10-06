import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getSettings, saveSettings } from '@/lib/db'
import { DEFAULT_SETTINGS, type UserSettings } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import { SettingsContext } from '@/hooks/useSettings'
import { applyTheme, storedTheme } from '@/lib/theme'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS, theme: storedTheme() })

  useEffect(() => {
    if (!user) return
    getSettings()
      .then((data) => setSettings((s) => ({ ...s, ...data })))
      .catch(() => {})
  }, [user])

  // keep following the OS theme while on "system"
  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [settings.theme])

  const update = useCallback(
    async (patch: Partial<UserSettings>) => {
      setSettings((s) => ({ ...s, ...patch }))
      if (!user) return
      await saveSettings(patch)
    },
    [user],
  )

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}
