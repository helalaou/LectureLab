import type { Config } from '@netlify/functions'
import { errorResponse, getSettings, HttpError, logUsage, requireOpenAIKey, requireUser, type User, type UserSettings } from '../lib/server.ts'
import { loadLecture } from '../lib/lecture.ts'
import { buildMessages, MARKDOWN_TYPES, SCHEMAS, type GenerateOptions, type OutputType } from '../lib/prompts.ts'
import { streamChat } from '../lib/openai.ts'
import { ndjson } from '../lib/stream.ts'
import { deleteAudio } from '../lib/audio.ts'

const TYPES: OutputType[] = ['summary', 'notes', 'flashcards', 'quiz', 'podcast', 'visuals', 'glossary', 'study_guide']

/**
 * POST /api/generate { lectureId, type, options }
 * Streams: {t:"delta", d:"..."}*  then  {t:"done", output}  or  {t:"error", error}
 */
export default async (req: Request) => {
  let user: User, keyInfo: { key: string; shared: boolean }, settings: UserSettings
  let body: { lectureId?: string; type?: OutputType; options?: GenerateOptions }
  try {
    user = await requireUser(req)
    keyInfo = await requireOpenAIKey(user)
    settings = await getSettings(user)
    body = await req.json()
    if (!body.lectureId || !/^[\w-]+$/.test(body.lectureId) || !body.type || !TYPES.includes(body.type)) throw new HttpError(400, 'Bad request.')
  } catch (e) {
    return errorResponse(e)
  }
  const { lectureId, type } = body as { lectureId: string; type: OutputType }
  const options = body.options || {}

  return ndjson(async (send) => {
    send({ t: 'status', status: 'reading' })
    const lec = await loadLecture(user, lectureId)
    const messages = buildMessages(type, {
      lectureTitle: lec.lecture.title,
      courseName: lec.courseName,
      sourcesText: lec.sourcesText,
      detailLevel: settings.detail_level,
      language: settings.output_language,
      options: {
        focus: typeof options.focus === 'string' ? options.focus.slice(0, 500) : undefined,
        count: options.count ? Math.max(3, Math.min(60, Number(options.count))) : undefined,
        difficulty: options.difficulty,
        length: options.length,
      },
    })

    send({ t: 'status', status: 'writing' })
    const isMarkdown = MARKDOWN_TYPES.includes(type)
    const schema = SCHEMAS[type]
    let full = ''
    const gen = streamChat({
      key: keyInfo.key,
      model: settings.text_model,
      messages,
      schema: isMarkdown || !schema ? undefined : { name: type, schema },
      maxTokens: type === 'podcast' ? 8000 : 16000,
    })
    for await (const d of gen) {
      full += d
      send({ t: 'delta', d })
    }

    let content: Record<string, unknown>
    if (isMarkdown) {
      content = { markdown: full.replace(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```\s*$/i, '$1').trim() }
    } else {
      try {
        content = JSON.parse(full)
      } catch {
        throw new Error('The AI response was incomplete. Please try again.')
      }
    }
    if (lec.truncated) content._truncated = true

    const outPath = `${lec.path}/outputs/${type}`
    // Regenerating a podcast script invalidates its old audio file.
    if (type === 'podcast') {
      const old = await user.db.get<{ audio_path?: string | null }>(outPath)
      if (old?.audio_path) await deleteAudio(old.audio_path).catch(() => {})
    }

    const now = new Date().toISOString()
    const output = { type, lecture_id: lectureId, content, audio_path: null, model: settings.text_model, created_at: now }
    await user.db.set(outPath, output)

    const patch: Record<string, unknown> = {
      output_types: Array.from(new Set([...(lec.lecture.output_types || []), type])),
      updated_at: now,
    }
    // The summary suggests a better title — apply it if the lecture still has a default name.
    if (type === 'summary') {
      const suggestion = (content as { title_suggestion?: string }).title_suggestion
      if (suggestion && /^(untitled|new lecture|recording|lecture)\b/i.test(lec.lecture.title || 'untitled')) patch.title = suggestion
    }
    await user.db.update(lec.path, patch)

    await logUsage(user, 'generate', full.length, keyInfo.shared, settings.text_model)
    send({ t: 'done', output: { ...output, id: type } })
  })
}

export const config: Config = { path: '/api/generate', method: 'POST' }
