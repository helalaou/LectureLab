import { auth } from './firebase'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

async function toError(res: Response): Promise<ApiError> {
  let msg = `Request failed (${res.status})`
  let code: string | undefined
  try {
    const body = await res.json()
    msg = body.error || msg
    code = body.code
  } catch {
    if (res.status === 404) msg = 'The server functions are not running. Use "npm run dev" (Netlify Dev) locally, or deploy to Netlify.'
  }
  return new ApiError(res.status, msg, code)
}

