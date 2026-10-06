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
    if (res.status === 404)
      msg = 'The server functions are not running. Use "npm run dev" (Netlify Dev) locally, or deploy to Netlify.'
  }
  return new ApiError(res.status, msg, code)
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    ...(await authHeader()),
    ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
    ...(init.headers as Record<string, string>),
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) throw await toError(res)
  return res.json()
}

export async function apiBlob(path: string, body: unknown, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { ...(await authHeader()), 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw await toError(res)
  return res.blob()
}

export type StreamEvent =
  | { t: 'status'; status: string }
  | { t: 'delta'; d: string }
  | { t: 'done'; [k: string]: unknown }
  | { t: 'error'; error: string; code?: string }

/** POST and read a newline-delimited JSON stream of events. */
export async function apiStream(path: string, body: unknown, onEvent: (e: StreamEvent) => void, signal?: AbortSignal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { ...(await authHeader()), 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) throw await toError(res)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let finished = false
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line) continue
      const evt = JSON.parse(line) as StreamEvent
      if (evt.t === 'error') throw new ApiError(500, evt.error, evt.code)
      if (evt.t === 'done') finished = true
      onEvent(evt)
    }
  }
  if (!finished)
    throw new ApiError(
      504,
      'The connection closed before the AI finished (it may have taken longer than 60 seconds). Try again, or pick a shorter option.',
    )
}
