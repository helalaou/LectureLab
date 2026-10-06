import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { firebaseConfig, isFirebaseConfigured } from '@/config/env'

/** Placeholder config so the app can render its setup screen before Firebase is configured. */
const PLACEHOLDER = { apiKey: 'unset', projectId: 'demo-project', authDomain: 'localhost', appId: 'unset' }

export const firebaseConfigured = isFirebaseConfigured
export const app = initializeApp(isFirebaseConfigured ? firebaseConfig : PLACEHOLDER)
export const auth = getAuth(app)
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
