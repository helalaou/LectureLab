import type { Config } from '@netlify/functions'
import { errorResponse, getSettings, HttpError, json, logUsage, requireOpenAIKey, requireUser } from '../lib/server.ts'
import { transcribe } from '../lib/openai.ts'
import { transcriptionPrompt } from '../lib/prompts.ts'

/**
 * POST /api/transcribe  (multipart/form-data)
 *   file          — one short audio chunk (the browser splits recordings into ~60 s WAV pieces)
 *   durationSec   — chunk length, for usage tracking
 *   courseName, lectureTitle, previousText — context that improves accuracy
 *
 * Chunking happens in the browser so each request stays far below Netlify's
 * request-size and time limits and OpenAI's per-file limits.
 */
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const { key, shared } = await requireOpenAIKey(user)
    const settings = await getSettings(user)

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof Blob)) throw new HttpError(400, 'No audio received.')
    if (file.size > 5_500_000) throw new HttpError(413, 'Audio chunk too large.')

    const text = await transcribe({
      key,
      model: settings.transcription_model,
      audio: file,
      filename: (file as File).name || 'chunk.wav',
      prompt: transcriptionPrompt({
        courseName: String(form.get('courseName') || ''),
        lectureTitle: String(form.get('lectureTitle') || ''),
        previousText: String(form.get('previousText') || ''),
      }),
    })

    const duration = Number(form.get('durationSec') || 0)
    await logUsage(user, 'transcribe_seconds', duration, shared, settings.transcription_model)
    return json({ text })
  } catch (e) {
    return errorResponse(e)
  }
}

export const config: Config = { path: '/api/transcribe', method: 'POST' }
