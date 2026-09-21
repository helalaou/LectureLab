/**
 * Audio files live in Netlify Blobs, behind the /api/audio function.
 * Uploads are split into 3 MB parts; playback uses short-lived signed URLs.
 */
import { authHeader } from './api'

const PART_SIZE = 3 * 1024 * 1024
export const MAX_STORED_AUDIO = 100 * 1024 * 1024

export async function uploadAudio(key: string, blob: Blob, onProgress?: (p: number) => void): Promise<void> {
  const parts = Math.max(1, Math.ceil(blob.size / PART_SIZE))
  const type = (blob.type || 'audio/webm').split(';')[0]
  for (let i = 0; i < parts; i++) {
    const body = blob.slice(i * PART_SIZE, (i + 1) * PART_SIZE)
    const qs = new URLSearchParams({ key, part: String(i), parts: String(parts), size: String(blob.size), type })
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(`/api/audio?${qs}`, { method: 'PUT', headers: { ...(await authHeader()), 'content-type': 'application/octet-stream' }, body })
      if (res.ok) break
      if (attempt >= 3) throw new Error(`Audio upload failed (${res.status})`)
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
    onProgress?.((i + 1) / parts)
  }
}

const urlCache = new Map<string, { url: string; at: number }>()

/** A signed URL an <audio> element can play (valid ~6 hours). */
export async function audioUrl(key: string): Promise<string> {
  const hit = urlCache.get(key)
  if (hit && Date.now() - hit.at < 5 * 3600_000) return hit.url
  const res = await fetch(`/api/audio?key=${encodeURIComponent(key)}`, { method: 'POST', headers: await authHeader() })
  if (!res.ok) throw new Error('Could not load audio')
  const { url } = (await res.json()) as { url: string }
  urlCache.set(key, { url, at: Date.now() })
  return url
}

export async function deleteAudio(key: string) {
  await fetch(`/api/audio?key=${encodeURIComponent(key)}`, { method: 'DELETE', headers: await authHeader() })
}

/** Download a whole file (the server returns it in ranged pieces). */
export async function fetchAudioBlob(url: string): Promise<Blob> {
  const pieces: Blob[] = []
  let start = 0
  let total = Infinity
  let type = 'audio/mpeg'
  while (start < total) {
    const res = await fetch(url, { headers: { range: `bytes=${start}-` } })
    if (!res.ok) throw new Error('Download failed')
    const b = await res.blob()
    type = res.headers.get('content-type') || type
    pieces.push(b)
    const cr = res.headers.get('content-range')
    total = cr ? Number(cr.split('/')[1]) : b.size
    start += b.size
    if (!b.size) break
  }
  return new Blob(pieces, { type })
}
