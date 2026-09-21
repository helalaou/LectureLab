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

