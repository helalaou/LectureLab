import type { Config } from '@netlify/functions'
import { errorResponse, getSettings, HttpError, logUsage, requireOpenAIKey, requireUser } from '../lib/server.ts'
import { speech } from '../lib/openai.ts'
import { TTS_INSTRUCTIONS } from '../lib/prompts.ts'

/**
 * POST /api/tts { text, speaker: "A" | "B" } → audio/mpeg
 * The podcast player calls this once per line and stitches the MP3s together.
 */
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const { key, shared } = await requireOpenAIKey(user)
    const settings = await getSettings(user)
    const { text, speaker } = (await req.json()) as { text?: string; speaker?: 'A' | 'B' }
    const input = (text || '').trim()
    if (!input) throw new HttpError(400, 'Nothing to read.')
    if (input.length > 4000) throw new HttpError(400, 'Line too long for text-to-speech.')
    const who = speaker === 'B' ? 'B' : 'A'

    const audio = await speech({
      key,
      model: settings.tts_model,
      voice: who === 'A' ? settings.host_a_voice : settings.host_b_voice,
      input,
      instructions: TTS_INSTRUCTIONS[who],
    })
    await logUsage(user, 'tts_chars', input.length, shared, settings.tts_model)
    return new Response(audio, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } })
  } catch (e) {
    return errorResponse(e)
  }
}

export const config: Config = { path: '/api/tts', method: 'POST' }
