import type { Config } from '@netlify/functions'
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
      const exp = Math.floor(Date.now() / 1000) + 6 * 3600
      return json({ url: `/api/audio?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sign(key, exp)}` })
    }
    // PUT one part
    const part = Number(url.searchParams.get('part'))
    const parts = Number(url.searchParams.get('parts'))
    const size = Number(url.searchParams.get('size'))
    const type = (url.searchParams.get('type') || 'audio/webm').split(';')[0]
    if (!Number.isInteger(part) || !Number.isInteger(parts) || part < 0 || part >= parts || parts > 40) throw new HttpError(400, 'Bad part.')
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

