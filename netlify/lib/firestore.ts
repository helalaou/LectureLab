/**
 * Minimal Firestore REST client that acts *as the signed-in user*.
 * Every request carries the user's Firebase ID token, so Firestore security
 * rules apply exactly as they do in the browser. No service account needed.
 */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }
type FsValue = Record<string, unknown>

export function projectId(): string {
  const id = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
  if (!id) throw new Error('Server is missing the VITE_FIREBASE_PROJECT_ID environment variable. See README.')
  return id
}

const base = () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`

// ------------------------------------------------------------------ value encoding

export function encode(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } }
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } }
  return { stringValue: String(v) }
}

function encodeFields(o: Record<string, unknown>): Record<string, FsValue> {
  const out: Record<string, FsValue> = {}
  for (const [k, val] of Object.entries(o)) if (val !== undefined) out[k] = encode(val)
  return out
}

export function decode(v: FsValue): Json {
  if ('stringValue' in v) return v.stringValue as string
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('booleanValue' in v) return v.booleanValue as boolean
  if ('nullValue' in v) return null
  if ('timestampValue' in v) return v.timestampValue as string
  if ('arrayValue' in v) return ((v.arrayValue as { values?: FsValue[] }).values || []).map(decode)
  if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: Record<string, FsValue> }).fields || {})
  return null
}

function decodeFields(f: Record<string, FsValue>): { [k: string]: Json } {
  const out: { [k: string]: Json } = {}
  for (const [k, val] of Object.entries(f)) out[k] = decode(val)
  return out
}

interface RawDoc {
  name: string
  fields?: Record<string, FsValue>
}

function toObj<T>(d: RawDoc): T & { id: string } {
  return { ...(decodeFields(d.fields || {}) as object), id: d.name.split('/').pop()! } as T & { id: string }
}

// ------------------------------------------------------------------ client

export class Firestore {
  constructor(private token: string) {}

  private async req(url: string, init: RequestInit = {}) {
    const res = await fetch(url, {
      ...init,
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', ...(init.headers || {}) },
    })
    return res
  }

  async get<T = Record<string, Json>>(path: string): Promise<(T & { id: string }) | null> {
    const res = await this.req(`${base()}/${path}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Firestore read failed (${res.status}): ${await res.text()}`)
    return toObj<T>(await res.json())
  }

  async list<T = Record<string, Json>>(
    collectionPath: string,
    opts: { orderBy?: string; desc?: boolean; limit?: number } = {},
  ): Promise<(T & { id: string })[]> {
    const out: (T & { id: string })[] = []
    let pageToken = ''
    do {
      const qs = new URLSearchParams()
      qs.set('pageSize', String(Math.min(opts.limit ?? 300, 300)))
      if (opts.orderBy) qs.set('orderBy', `${opts.orderBy}${opts.desc ? ' desc' : ''}`)
      if (pageToken) qs.set('pageToken', pageToken)
      const res = await this.req(`${base()}/${collectionPath}?${qs}`)
      if (!res.ok) throw new Error(`Firestore list failed (${res.status}): ${await res.text()}`)
      const body = (await res.json()) as { documents?: RawDoc[]; nextPageToken?: string }
      for (const d of body.documents || []) out.push(toObj<T>(d))
      pageToken = body.nextPageToken || ''
    } while (pageToken && (!opts.limit || out.length < opts.limit))
    return opts.limit ? out.slice(0, opts.limit) : out
  }

  /** Create or fully replace a document. */
  async set(path: string, data: Record<string, unknown>) {
    const res = await this.req(`${base()}/${path}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeFields(data) }),
    })
    if (!res.ok) throw new Error(`Firestore write failed (${res.status}): ${await res.text()}`)
  }

  /** Update only the given top-level fields. */
  async update(path: string, data: Record<string, unknown>) {
    const qs = Object.keys(data)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&')
    const res = await this.req(`${base()}/${path}?${qs}&currentDocument.exists=true`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeFields(data) }),
    })
    if (!res.ok) throw new Error(`Firestore update failed (${res.status}): ${await res.text()}`)
  }

  /** Add a document with an auto-generated id. Returns the id. */
  async add(collectionPath: string, data: Record<string, unknown>): Promise<string> {
    const res = await this.req(`${base()}/${collectionPath}`, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeFields(data) }),
    })
    if (!res.ok) throw new Error(`Firestore create failed (${res.status}): ${await res.text()}`)
    return ((await res.json()) as RawDoc).name.split('/').pop()!
  }

  async delete(path: string) {
    await this.req(`${base()}/${path}`, { method: 'DELETE' })
  }
}
