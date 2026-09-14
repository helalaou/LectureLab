/**
 * Audio storage on Netlify Blobs.
 * Files are uploaded in ~3 MB parts (to stay under function request limits)
 * and served back with HTTP Range support so audio players can seek.
 */
import { getStore } from '@netlify/blobs'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const PART_SIZE = 3 * 1024 * 1024

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

