import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, saveSettings } from '../lib/db'
import { DEFAULT_SETTINGS, type UserSettings } from '../lib/types'
import { useAuth } from './useAuth'

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

