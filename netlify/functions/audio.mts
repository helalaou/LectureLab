import type { Config } from '@netlify/functions'
import { AUDIO_URL_TTL_SECONDS } from '../../shared/limits.ts'
import { errorResponse, HttpError, json, requireUser } from '../lib/server.ts'
import { deleteAudio, PART_SIZE, sign, store, verifySignature, type AudioMeta } from '../lib/audio.ts'

/**
 * Audio files (recordings, uploads, podcasts) stored in Netlify Blobs.
 *
 *  PUT    /api/audio?key=<uid>/<lecture>/<file>&part=0&parts=3&size=…&type=audio/webm   (auth)  one ~3 MB part
 *  POST   /api/audio?key=…   (auth)  → { url }  a signed, 6-hour playback URL
 *  DELETE /api/audio?key=…   (auth)
 *  GET    /api/audio?key=…&exp=…&sig=…   playback, supports Range requests
 */
export default async (req: Request) => {
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get('key') || ''
    if (!/^[\w-]+\/[\w-]+\/[\w.-]+$/.test(key)) throw new HttpError(400, 'Bad audio key.')

    if (req.method === 'GET') return await serve(req, key, url)

    const user = await requireUser(req)
    if (!key.startsWith(`${user.uid}/`)) throw new HttpError(403, 'Not your file.')

    if (req.method === 'DELETE') {
      await deleteAudio(key)
      return json({ ok: true })
    }
    if (req.method === 'POST') {
      const exp = Math.floor(Date.now() / 1000) + AUDIO_URL_TTL_SECONDS
      return json({ url: `/api/audio?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sign(key, exp)}` })
    }
    // PUT one part
    const part = Number(url.searchParams.get('part'))
    const parts = Number(url.searchParams.get('parts'))
    const size = Number(url.searchParams.get('size'))
    const type = (url.searchParams.get('type') || 'audio/webm').split(';')[0]
    if (!Number.isInteger(part) || !Number.isInteger(parts) || part < 0 || part >= parts || parts > 40)
      throw new HttpError(400, 'Bad part.')
    const body = await req.arrayBuffer()
    if (body.byteLength > PART_SIZE) throw new HttpError(413, 'Part too large.')
    const s = store()
    await s.set(`${key}#${part}`, body)
    if (part === parts - 1) {
      const meta: AudioMeta = { size, parts, partSize: PART_SIZE, type }
      await s.setJSON(`${key}#meta`, meta)
    }
    return json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}

async function serve(req: Request, key: string, url: URL): Promise<Response> {
  const exp = Number(url.searchParams.get('exp'))
  if (!verifySignature(key, exp, url.searchParams.get('sig') || '')) throw new HttpError(403, 'Link expired.')
  const s = store()
  const meta = (await s.get(`${key}#meta`, { type: 'json' })) as AudioMeta | null
  if (!meta) throw new HttpError(404, 'Audio not found.')

  // Parse "bytes=start-end"; serve at most one stored part per response.
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '')
  let start = m && m[1] ? Number(m[1]) : 0
  let end = m && m[2] ? Number(m[2]) : meta.size - 1
  if (m && !m[1] && m[2]) {
    start = Math.max(0, meta.size - Number(m[2]))
    end = meta.size - 1
  }
  if (start >= meta.size)
    return new Response(null, { status: 416, headers: { 'content-range': `bytes */${meta.size}` } })
  const partIndex = Math.floor(start / meta.partSize)
  const partStart = partIndex * meta.partSize
  end = Math.min(end, partStart + meta.partSize - 1, meta.size - 1)
  const buf = (await s.get(`${key}#${partIndex}`, { type: 'arrayBuffer' })) as ArrayBuffer | null
  if (!buf) throw new HttpError(404, 'Audio part missing.')
  const slice = buf.slice(start - partStart, end - partStart + 1)
  const headers = {
    'content-type': meta.type,
    'accept-ranges': 'bytes',
    'content-length': String(slice.byteLength),
    'cache-control': 'private, max-age=3600',
  }
  if (!m && meta.parts === 1) return new Response(slice, { status: 200, headers })
  return new Response(slice, {
    status: 206,
    headers: { ...headers, 'content-range': `bytes ${start}-${end}/${meta.size}` },
  })
}

export const config: Config = { path: '/api/audio', method: ['GET', 'PUT', 'POST', 'DELETE'] }
