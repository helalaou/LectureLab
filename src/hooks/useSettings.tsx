import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, saveSettings } from '@/lib/db'
import { DEFAULT_SETTINGS, type UserSettings } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

interface SettingsState {
  settings: UserSettings
  update: (patch: Partial<UserSettings>) => Promise<void>
}

const Ctx = createContext<SettingsState>(null as unknown as SettingsState)

export function applyTheme(theme: UserSettings['theme']) {
  try {
    localStorage.setItem('ll-theme', theme)
  } catch {
    /* ignore */
  }
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#fafafa')
}

function localTheme(): UserSettings['theme'] {
  try {
    return (localStorage.getItem('ll-theme') as UserSettings['theme']) || 'system'
  } catch {
    return 'system'
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS, theme: localTheme() })

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

  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)
