/**
 * Minimal Firestore REST client that acts *as the signed-in user*.
 * Every request carries the user's Firebase ID token, so Firestore security
 * rules apply exactly as they do in the browser. No service account needed.
 */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }
type FsValue = Record<string, unknown>

export function projectId(): string {
  const id = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (!id) throw new Error('Server is missing the VITE_FIREBASE_PROJECT_ID environment variable. See README.')
  return id
}

const base = () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`

// ------------------------------------------------------------------ value encoding

export function encode(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } }
  return { stringValue: String(v) }
}

