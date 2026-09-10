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

