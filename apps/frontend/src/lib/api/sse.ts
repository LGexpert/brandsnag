export type SseMessage = {
  event: string
  data: string
}

export async function readSseStream(args: {
  response: Response
  onMessage: (msg: SseMessage) => void
  signal?: AbortSignal
}) {
  const { response, onMessage, signal } = args

  const body = response.body
  if (!body) throw new Error('Missing response body')

  const reader = body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  while (true) {
    if (signal?.aborted) {
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
      throw new DOMException('Aborted', 'AbortError')
    }

    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const idx = buffer.indexOf('\n\n')
      if (idx === -1) break

      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      let event = 'message'
      const dataLines: string[] = []

      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice('event:'.length).trim()
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).trim())
        }
      }

      onMessage({ event, data: dataLines.join('\n') })
    }
  }
}
