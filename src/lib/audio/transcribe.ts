import { ApiError } from '@/lib/api'
import { authHeader } from '@/lib/api'
import type { Segment } from '@/lib/types'
import type { StoredChunk } from '@/lib/audio/recorder'

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

/** Split a chunk's text into sentences and spread its time span across them. */
function toSegments(text: string, start: number, duration: number): Segment[] {
  const sentences =
    text
      .match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) || []
  if (!sentences.length) return []
  // group short sentences so segments are ~1-3 sentences
  const groups: string[] = []
  let cur = ''
  for (const s of sentences) {
    cur = cur ? `${cur} ${s}` : s
    if (cur.length > 140) {
      groups.push(cur)
      cur = ''
    }
  }
  if (cur) groups.push(cur)
  const total = groups.reduce((n, g) => n + g.length, 0)
  let t = start
  return groups.map((g) => {
    const d = (g.length / total) * duration
    const seg = { start: t, end: t + d, text: g }
    t += d
    return seg
  })
}

/**
 * Transcribe chunks with limited parallelism and retries.
 * Returns the full text plus approximate timestamped segments.
 */
export async function transcribeChunks(
  chunks: StoredChunk[],
  ctx: Ctx,
): Promise<{ text: string; segments: Segment[] }> {
  const results: string[] = new Array(chunks.length).fill('')
  let done = 0
  let next = 0
  ctx.onProgress?.(0, chunks.length)

  const worker = async () => {
    while (next < chunks.length) {
      const i = next++
      let attempt = 0
      while (true) {
        try {
          results[i] = await transcribeOne(chunks[i], i, ctx, i > 0 ? results[i - 1] : '')
          break
        } catch (e) {
          attempt++
          const err = e as ApiError
          const fatal = err.status === 401 || err.status === 402 || err.status === 400 || err.name === 'AbortError'
          if (fatal || attempt >= 4) throw e
          await new Promise((r) => setTimeout(r, 1500 * attempt * attempt))
        }
      }
      done++
      ctx.onProgress?.(done, chunks.length)
    }
  }
  await Promise.all([worker(), worker(), worker()])

  const segments = chunks.flatMap((c, i) => toSegments(results[i], c.start, c.duration))
  const text = results.filter(Boolean).join('\n\n')
  return { text, segments }
}
