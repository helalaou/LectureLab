import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  /** True when the user opened an email sign-in link on a device that doesn't know their email. */
  emailLinkNeedsEmail: boolean
  finishEmailLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
