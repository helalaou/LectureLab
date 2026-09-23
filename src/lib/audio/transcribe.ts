import { ApiError } from '../api'
import { authHeader } from '../api'
import type { Segment } from '../types'
import type { StoredChunk } from './recorder'

interface Ctx {
  courseName?: string
  lectureTitle?: string
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

async function transcribeOne(chunk: StoredChunk, index: number, ctx: Ctx, previousText: string): Promise<string> {
  const form = new FormData()
  form.append('file', chunk.blob, `chunk-${index}.wav`)
  form.append('durationSec', String(Math.round(chunk.duration)))
  if (ctx.courseName) form.append('courseName', ctx.courseName)
  if (ctx.lectureTitle) form.append('lectureTitle', ctx.lectureTitle)
  if (previousText) form.append('previousText', previousText.slice(-600))
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: await authHeader(),
    body: form,
    signal: ctx.signal,
  })
  if (!res.ok) {
    let msg = `Transcription failed (${res.status})`
    let code: string | undefined
    try {
      const b = await res.json()
      msg = b.error || msg
      code = b.code
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg, code)
  }
  const body = (await res.json()) as { text: string }
  return body.text
}

