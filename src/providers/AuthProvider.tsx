import { useEffect, useState, type ReactNode } from 'react'
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
import { auth } from '@/lib/firebase'
import { AuthContext, type AuthState } from '@/hooks/useAuth'

const EMAIL_KEY = 'll-signin-email'

function storedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

async function completeEmailLink(email: string) {
  await signInWithEmailLink(auth, email, window.location.href)
  window.history.replaceState(null, '', window.location.pathname)
  try {
    localStorage.removeItem(EMAIL_KEY)
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailLinkNeedsEmail, setEmailLinkNeedsEmail] = useState(
    () => isSignInWithEmailLink(auth, window.location.href) && !storedEmail(),
  )

  useEffect(() => {
    // Finish an email-link sign-in if we arrived from the email on the same device.
    const email = storedEmail()
    if (email && isSignInWithEmailLink(auth, window.location.href)) {
      completeEmailLink(email).catch((e) => console.error(e))
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
    emailLinkNeedsEmail,
    async finishEmailLink(email: string) {
      await completeEmailLink(email.trim())
      setEmailLinkNeedsEmail(false)
    },
    async signOut() {
      await fbSignOut(auth)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
