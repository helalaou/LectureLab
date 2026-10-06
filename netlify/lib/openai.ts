import { openAIError } from './server.ts'

const BASE = 'https://api.openai.com/v1'

/** We never send temperature etc. so the same code works for reasoning and non-reasoning models. */
export interface ChatRequest {
  key: string
  model: string
  messages: { role: string; content: string }[]
  schema?: { name: string; schema: Record<string, unknown> }
  maxTokens?: number
}

/**
 * Calls Chat Completions with stream=true and yields text deltas.
 * Works for both Markdown and Structured-Output (JSON schema) requests.
 */
export async function* streamChat(req: ChatRequest): AsyncGenerator<string, { usage?: unknown }> {
  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: req.maxTokens ?? 16000,
  }
  // Reasoning models (GPT-5/6 families, o-series): keep thinking short so answers stream quickly.
  if (/^(gpt-[5-9]|o\d)/.test(req.model)) body.reasoning_effort = 'low'
  if (req.schema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: req.schema.name, strict: true, schema: req.schema.schema },
    }
  }
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${req.key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) throw await openAIError(res)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let usage: unknown
  let finishReason: string | null = null
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const evt = JSON.parse(data)
        if (evt.usage) usage = evt.usage
        const choice = evt.choices?.[0]
        if (choice?.finish_reason) finishReason = choice.finish_reason
        const delta = choice?.delta?.content
        if (delta) yield delta
        const refusal = choice?.delta?.refusal
        if (refusal) throw new Error(`The model refused: ${refusal}`)
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('The model refused')) throw e
      }
    }
  }
  if (finishReason === 'length') {
    throw new Error(
      'The answer was cut off because it got too long. Try "concise" detail level in Settings, or fewer items.',
    )
  }
  return { usage }
}

export async function transcribe(opts: {
  key: string
  model: string
  audio: Blob
  filename: string
  prompt?: string
  language?: string
}): Promise<string> {
  const form = new FormData()
  form.append('file', opts.audio, opts.filename)
  form.append('model', opts.model)
  form.append('response_format', 'json')
  if (opts.prompt) form.append('prompt', opts.prompt)
  if (opts.language) form.append('language', opts.language)
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.key}` },
    body: form,
  })
  if (!res.ok) {
    // Some transcription models don't accept a prompt; retry once without it.
    if (res.status === 400 && opts.prompt) {
      const body = await res.clone().text()
      if (/prompt/i.test(body)) return transcribe({ ...opts, prompt: undefined })
    }
    throw await openAIError(res)
  }
  const data = (await res.json()) as { text?: string }
  return (data.text || '').trim()
}

export async function speech(opts: {
  key: string
  model: string
  voice: string
  input: string
  instructions?: string
}): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    model: opts.model,
    voice: opts.voice,
    input: opts.input,
    response_format: 'mp3',
  }
  // Only the gpt-4o-*-tts family understands voice "instructions".
  if (opts.instructions && /gpt-(4o|realtime)/.test(opts.model)) body.instructions = opts.instructions
  const res = await fetch(`${BASE}/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await openAIError(res)
  return res.arrayBuffer()
}

export async function validateKey(key: string): Promise<boolean> {
  const res = await fetch(`${BASE}/models`, { headers: { authorization: `Bearer ${key}` } })
  return res.ok
}
