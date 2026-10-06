import type { Theme } from '@shared/settings'

export type { Theme }

const STORAGE_KEY = 'll-theme'

/** Applies a theme to <html> and remembers it so the next load paints correctly. */
export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#fafafa')
}

/** The theme saved on this device, used before the user's settings load. */
export function storedTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  } catch {
    return 'system'
  }
}
