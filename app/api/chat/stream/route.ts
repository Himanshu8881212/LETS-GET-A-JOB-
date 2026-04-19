import { chatWithScoutStream } from '@/lib/services/ai/scout'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ error: 'message required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }
      try {
        for await (const chunk of chatWithScoutStream({
          message: body.message,
          sessionId: body.sessionId,
          history: Array.isArray(body.history) ? body.history : undefined,
        })) {
          if (chunk.error) send('error', { message: chunk.error })
          else if (chunk.text) send('text', { text: chunk.text })
          else if (chunk.reasoning) send('reasoning', { text: chunk.reasoning })
          else if (chunk.usage) send('usage', chunk.usage)
          if (chunk.done) {
            send('done', {})
            break
          }
        }
      } catch (e: any) {
        send('error', { message: e?.message || String(e) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
