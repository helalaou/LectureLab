/**
 * Shared helpers for every Netlify Function:
 *  - verify the Firebase ID token sent by the browser
 *  - decide which OpenAI key to use (user's own key, or the shared key if allowlisted)
 *  - encrypt / decrypt personal keys
 *  - small JSON / error helpers and usage logging
 */
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { Firestore, projectId } from './firestore.ts'

export class HttpError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new HttpError(500, `Server is missing the ${name} environment variable. See README → Setup.`)
  return v
}

export interface User {
  uid: string
  email: string | null
  emailVerified: boolean
  /** Firestore client that acts as this user (security rules apply). */
  db: Firestore
}

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))

export async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'You need to sign in first.')
  try {
    const pid = projectId()
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${pid}`, audience: pid })
    return {
      uid: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true,
      db: new Firestore(token),
    }
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(401, 'Your session expired. Please sign in again.')
  }
}

// ---------------------------------------------------------------- crypto

function encryptionKey(): Buffer {
  // Derive a fixed 32-byte key from whatever secret string the owner configured.
  return createHash('sha256').update(env('KEY_ENCRYPTION_SECRET')).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':')
}

export function decryptSecret(blob: string): string {
  const [v, iv, tag, data] = blob.split(':')
  if (v !== 'v1') throw new Error('Unknown key format')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}

// ---------------------------------------------------------------- key resolution

export interface AccessInfo {
  hasOwnKey: boolean
  ownKeyLast4: string | null
  allowlisted: boolean
  canUseAI: boolean
}

/** Emails allowed to use the owner's shared key: ALLOWED_EMAILS="a@x.com, b@y.com" */
function allowlist(): string[] {
  return (process.env.ALLOWED_EMAILS || '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function getAccess(user: User): Promise<AccessInfo & { key: string | null; shared: boolean }> {
  const keyDoc = await user.db.get<{ encrypted: string; last4: string }>(`users/${user.uid}/private/openai`)
  const allowlisted = !!user.email && user.emailVerified && allowlist().includes(user.email)
  let key: string | null = null
  let shared = false
  if (keyDoc?.encrypted) {
    try {
      key = decryptSecret(keyDoc.encrypted)
    } catch {
      key = null
    }
  }
  if (!key && allowlisted && process.env.OPENAI_API_KEY) {
    key = process.env.OPENAI_API_KEY
    shared = true
  }
  return {
    hasOwnKey: !!keyDoc?.encrypted,
    ownKeyLast4: keyDoc?.last4 ?? null,
    allowlisted,
    canUseAI: !!key,
    key,
    shared,
  }
}

export async function requireOpenAIKey(user: User): Promise<{ key: string; shared: boolean }> {
  const a = await getAccess(user)
  if (!a.key) {
    throw new HttpError(
      402,
      'No OpenAI key available for your account. Open Settings → "Your OpenAI API key" and paste your own key to start using the AI features.',
      'no_key',
    )
  }
  return { key: a.key, shared: a.shared }
}

// ---------------------------------------------------------------- settings

export interface UserSettings {
  transcription_model: string
  text_model: string
  tts_model: string
  host_a_voice: string
  host_b_voice: string
  detail_level: 'concise' | 'standard' | 'detailed'
  output_language: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  transcription_model: 'gpt-transcribe',
  text_model: 'gpt-6-luna',
  tts_model: 'gpt-4o-mini-tts',
  host_a_voice: 'marin',
  host_b_voice: 'cedar',
  detail_level: 'standard',
  output_language: 'English',
}

export async function getSettings(user: User): Promise<UserSettings> {
  const doc = await user.db.get<{ settings?: Partial<UserSettings> }>(`users/${user.uid}`)
  return { ...DEFAULT_SETTINGS, ...(doc?.settings || {}) }
}

// ---------------------------------------------------------------- usage

export async function logUsage(user: User, kind: string, amount: number, shared: boolean, model?: string) {
  try {
    await user.db.add(`users/${user.uid}/usage`, { kind, amount, sharedKey: shared, model: model || null, email: user.email, created_at: new Date().toISOString() })
  } catch {
    /* never block the user on logging */
  }
}

// ---------------------------------------------------------------- responses

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status)
  console.error(err)
  const message = err instanceof Error ? err.message : 'Unexpected server error'
  return json({ error: message }, 500)
}

