import type { Config } from '@netlify/functions'
import { encryptSecret, errorResponse, HttpError, json, requireUser } from '../lib/server.ts'
import { validateKey } from '../lib/openai.ts'

/**
 * POST   /api/key  { key }  — validate and save the user's own OpenAI key (encrypted)
 * DELETE /api/key           — remove it
 */
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const path = `users/${user.uid}/private/openai`

    if (req.method === 'DELETE') {
      await user.db.delete(path)
      return json({ ok: true })
    }

    const { key } = (await req.json().catch(() => ({}))) as { key?: string }
    const clean = (key || '').trim()
    if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(clean)) {
      throw new HttpError(400, 'That does not look like an OpenAI API key. It should start with "sk-".')
    }
    if (!(await validateKey(clean))) {
      throw new HttpError(
        400,
        'OpenAI rejected this key. Double-check it, and make sure the account has billing set up.',
      )
    }
    await user.db.set(path, {
      encrypted: encryptSecret(clean),
      last4: clean.slice(-4),
      updated_at: new Date().toISOString(),
    })
    return json({ ok: true, last4: clean.slice(-4) })
  } catch (e) {
    return errorResponse(e)
  }
}

export const config: Config = { path: '/api/key', method: ['POST', 'DELETE'] }
