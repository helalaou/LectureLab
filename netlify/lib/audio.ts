/**
 * Audio storage on Netlify Blobs.
 * Files are uploaded in ~3 MB parts (to stay under function request limits)
 * and served back with HTTP Range support so audio players can seek.
 */
import { getStore } from '@netlify/blobs'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { AUDIO_PART_BYTES } from '../../shared/limits.ts'
import { env } from './env.ts'

export const PART_SIZE = AUDIO_PART_BYTES

export interface AudioMeta {
  size: number
  parts: number
  partSize: number
  type: string
}

export const store = () => getStore({ name: 'audio', consistency: 'strong' })

export async function deleteAudio(key: string) {
  const s = store()
  const meta = (await s.get(`${key}#meta`, { type: 'json' })) as AudioMeta | null
  const n = meta?.parts ?? 0
  await Promise.all([...Array.from({ length: n }, (_, i) => s.delete(`${key}#${i}`)), s.delete(`${key}#meta`)])
}

export function sign(key: string, exp: number): string {
  return createHmac('sha256', env.encryptionSecret).update(`${key}|${exp}`).digest('base64url')
}

export function verifySignature(key: string, exp: number, sig: string): boolean {
  if (!exp || exp < Date.now() / 1000) return false
  const a = Buffer.from(sign(key, exp))
  const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}
