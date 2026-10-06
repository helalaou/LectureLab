/**
 * Build-time configuration for the web app (Vite exposes only VITE_* variables).
 * See .env.example for the full list.
 */
const read = (key: string): string | undefined => {
  const value = (import.meta.env[key] as string | undefined)?.trim()
  return value || undefined
}

export const firebaseConfig = {
  apiKey: read('VITE_FIREBASE_API_KEY'),
  authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: read('VITE_FIREBASE_PROJECT_ID'),
  appId: read('VITE_FIREBASE_APP_ID'),
}

/** False when the deployment has not been connected to Firebase yet. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain,
)
