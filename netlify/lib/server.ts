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

