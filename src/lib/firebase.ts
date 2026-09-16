import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.authDomain)

export const app = initializeApp(firebaseConfigured ? config : { apiKey: 'x', projectId: 'demo-lecturelab', authDomain: 'localhost', appId: 'x' })
export const auth = getAuth(app)
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
