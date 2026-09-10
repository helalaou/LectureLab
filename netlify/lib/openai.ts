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
    throw new Error('The answer was cut off because it got too long. Try "concise" detail level in Settings, or fewer items.')
  }
  return { usage }
}

