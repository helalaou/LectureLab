import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState>(null as unknown as AuthState)
const EMAIL_KEY = 'll-signin-email'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Finish an email-link sign-in if we arrived from the email.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = ''
      try {
        email = localStorage.getItem(EMAIL_KEY) || ''
      } catch {
        /* ignore */
      }
      if (!email) email = window.prompt('Confirm your email to finish signing in') || ''
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => window.history.replaceState(null, '', window.location.pathname))
          .catch((e) => console.error(e))
      }
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const value: AuthState = {
    user,
    loading,
    async signInWithGoogle() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    async signInWithEmail(email: string) {
      await sendSignInLinkToEmail(auth, email.trim(), { url: window.location.origin, handleCodeInApp: true })
      try {
        localStorage.setItem(EMAIL_KEY, email.trim())
      } catch {
        /* ignore */
      }
    },
    async signOut() {
      await fbSignOut(auth)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
