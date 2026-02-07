/**
 * Deepgram streaming client for real-time speech-to-text.
 * Connects directly from the browser to Deepgram's WebSocket API.
 */

export type TranscriptCallback = (text: string, isFinal: boolean) => void
export type ErrorCallback = (error: Error) => void

export class DeepgramStreamingClient {
  private ws: WebSocket | null = null
  private onTranscript: TranscriptCallback
  private onError: ErrorCallback

  constructor(onTranscript: TranscriptCallback, onError: ErrorCallback) {
    this.onTranscript = onTranscript
    this.onError = onError
  }

  async connect(apiKey: string, language: string = 'zh'): Promise<void> {
    const url = new URL('wss://api.deepgram.com/v1/listen')
    // Use Nova-2 model with specified language
    url.searchParams.set('model', 'nova-2')
    url.searchParams.set('language', language) // 'zh' for Chinese, 'en' for English
    url.searchParams.set('smart_format', 'true')
    url.searchParams.set('punctuate', 'true')
    url.searchParams.set('interim_results', 'true')
    // Don't specify encoding - let Deepgram auto-detect from WebM container

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url.toString(), ['token', apiKey])

      this.ws.onopen = () => {
        console.log('🎤 Deepgram WebSocket connected')
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Log all Deepgram messages for debugging
          if (data.type === 'Metadata') {
            console.log('🎤 Deepgram metadata:', data)
            return
          }

          if (data.type === 'Results') {
            const transcript = data.channel?.alternatives?.[0]?.transcript || ''
            const isFinal = data.is_final || false
            console.log(`🎤 Deepgram ${isFinal ? 'final' : 'interim'}:`, transcript || '(empty)')

            if (transcript) {
              this.onTranscript(transcript, isFinal)
            }
          }
        } catch (err) {
          console.error('Failed to parse Deepgram message:', err)
        }
      }

      this.ws.onerror = () => {
        const error = new Error('Deepgram WebSocket error')
        this.onError(error)
        reject(error)
      }

      this.ws.onclose = (event) => {
        console.log('🎤 Deepgram WebSocket closed', event.code, event.reason)
      }
    })
  }

  async sendAudio(data: Blob | ArrayBuffer): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Convert Blob to ArrayBuffer if needed (WebSocket handles ArrayBuffer better)
      if (data instanceof Blob) {
        const buffer = await data.arrayBuffer()
        console.log(`🎤 Sending audio chunk: ${buffer.byteLength} bytes`)
        this.ws.send(buffer)
      } else {
        console.log(`🎤 Sending audio chunk: ${data.byteLength} bytes`)
        this.ws.send(data)
      }
    } else {
      console.log('🎤 WebSocket not open, state:', this.ws?.readyState)
    }
  }

  close(): void {
    if (this.ws) {
      // Send close message to get final results
      this.ws.send(JSON.stringify({ type: 'CloseStream' }))
      setTimeout(() => {
        this.ws?.close()
        this.ws = null
      }, 100)
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
