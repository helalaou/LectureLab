/**
 * Streams newline-delimited JSON events to the browser.
 * Streaming keeps the connection alive for long AI generations
 * (Netlify allows streamed responses to run up to 60 s).
 */
export type Send = (event: Record<string, unknown>) => void

export function ndjson(run: (send: Send) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        await run(send)
      } catch (e) {
        const err = e as { message?: string; code?: string }
        send({ t: 'error', error: err?.message || 'Something went wrong', code: err?.code })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no',
    },
  })
}
