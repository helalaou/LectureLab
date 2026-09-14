import type { Config } from '@netlify/functions'
import { errorResponse, getAccess, json, requireUser } from '../lib/server.ts'

/** GET /api/me — tells the app whether this user can use AI features and how. */
export default async (req: Request) => {
  try {
    const user = await requireUser(req)
    const a = await getAccess(user)
    return json({
      hasOwnKey: a.hasOwnKey,
      ownKeyLast4: a.ownKeyLast4,
      allowlisted: a.allowlisted,
      canUseAI: a.canUseAI,
      usingSharedKey: a.shared,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export const config: Config = { path: '/api/me', method: 'GET' }
