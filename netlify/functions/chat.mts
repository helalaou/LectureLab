import type { Config } from '@netlify/functions'
import { errorResponse, getSettings, HttpError, logUsage, requireOpenAIKey, requireUser, type User, type UserSettings } from '../lib/server.ts'
import { loadLecture } from '../lib/lecture.ts'
import { chatSystemPrompt } from '../lib/prompts.ts'
import { streamChat } from '../lib/openai.ts'
import { ndjson } from '../lib/stream.ts'

/**
 * POST /api/chat { lectureId, message }
 * Saves the question, streams the tutor's answer, then saves the answer.
 */
export default async (req: Request) => {
  let user: User, keyInfo: { key: string; shared: boolean }, settings: UserSettings
  let body: { lectureId?: string; message?: string }
  try {
    user = await requireUser(req)
    keyInfo = await requireOpenAIKey(user)
    settings = await getSettings(user)
    body = await req.json()
    if (!body.lectureId || !/^[\w-]+$/.test(body.lectureId) || !body.message?.trim()) throw new HttpError(400, 'Empty message.')
  } catch (e) {
    return errorResponse(e)
  }
  const lectureId = body.lectureId as string
  const message = (body.message as string).trim().slice(0, 4000)

  return ndjson(async (send) => {
    const lec = await loadLecture(user, lectureId, { timestamps: true })
    const chatPath = `${lec.path}/chat`
    const history = await user.db.list<{ role: string; content: string }>(chatPath, { orderBy: 'created_at', desc: true, limit: 16 })
    await user.db.add(chatPath, { role: 'user', content: message, created_at: new Date().toISOString() })

    const messages = [
      { role: 'system', content: chatSystemPrompt({ lectureTitle: lec.lecture.title, courseName: lec.courseName, sourcesText: lec.sourcesText, language: settings.output_language }) },
      ...history.reverse().map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    let full = ''
    for await (const d of streamChat({ key: keyInfo.key, model: settings.text_model, messages, maxTokens: 2500 })) {
      full += d
      send({ t: 'delta', d })
    }
    const created_at = new Date().toISOString()
    const id = await user.db.add(chatPath, { role: 'assistant', content: full, created_at })
    await logUsage(user, 'chat', full.length, keyInfo.shared, settings.text_model)
    send({ t: 'done', message: { id, role: 'assistant', content: full, created_at } })
  })
}

export const config: Config = { path: '/api/chat', method: 'POST' }
