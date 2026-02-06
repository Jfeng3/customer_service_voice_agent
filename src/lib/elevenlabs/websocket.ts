// ElevenLabs WebSocket streaming TTS client
import WebSocket from 'ws'

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID
const MODEL_ID = 'eleven_flash_v2_5' // 75ms TTFB vs ~1s for eleven_v3
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

export class ElevenLabsWebSocket {
  private ws: WebSocket | null = null
  private onAudioChunk: (audio: Buffer) => void
  private onError: (error: Error) => void
  private connected: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor(
    onAudioChunk: (audio: Buffer) => void,
    onError?: (error: Error) => void
  ) {
    this.onAudioChunk = onAudioChunk
    this.onError = onError || ((err) => console.error('ElevenLabs WS error:', err))
  }

  async connect(): Promise<void> {
    if (this.connected && this.ws) {
      return
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (!ELEVENLABS_API_KEY) {
        reject(new Error('ELEVENLABS_API_KEY not configured'))
        return
      }
      if (!VOICE_ID) {
        reject(new Error('ELEVENLABS_VOICE_ID not configured'))
        return
      }

      const url = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}`
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('🔊 ElevenLabs WebSocket connected')
        // Send initial config with BOS (beginning of stream)
        this.ws?.send(
          JSON.stringify({
            text: ' ',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
            xi_api_key: ELEVENLABS_API_KEY,
          })
        )
        this.connected = true
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString())

          if (data.audio) {
            // Decode base64 audio chunk
            const audioBuffer = Buffer.from(data.audio, 'base64')
            this.onAudioChunk(audioBuffer)
          }

          if (data.isFinal) {
            console.log('🔊 ElevenLabs stream final chunk received')
          }

          if (data.error) {
            this.onError(new Error(data.error))
          }
        } catch (err) {
          console.error('Failed to parse ElevenLabs message:', err)
        }
      }

      this.ws.onerror = (event) => {
        console.error('🔊 ElevenLabs WebSocket error:', event)
        this.onError(new Error('WebSocket connection error'))
        reject(new Error('WebSocket connection error'))
      }

      this.ws.onclose = (event) => {
        console.log('🔊 ElevenLabs WebSocket closed:', event.code, event.reason)
        this.connected = false
        this.connectionPromise = null
      }
    })

    return this.connectionPromise
  }

  sendText(text: string): void {
    if (!this.ws || !this.connected) {
      console.warn('ElevenLabs WebSocket not connected, cannot send text')
      return
    }

    // Send text chunk - ElevenLabs handles buffering internally
    this.ws.send(
      JSON.stringify({
        text,
        try_trigger_generation: true,
      })
    )
  }

  flush(): void {
    if (!this.ws || !this.connected) {
      return
    }

    // Send EOS (end of stream) to flush remaining audio
    this.ws.send(
      JSON.stringify({
        text: '',
      })
    )
    console.log('🔊 ElevenLabs flush sent')
  }

  close(): void {
    if (this.ws) {
      this.flush()
      // Give time for final audio chunks
      setTimeout(() => {
        this.ws?.close()
        this.ws = null
        this.connected = false
        this.connectionPromise = null
        console.log('🔊 ElevenLabs WebSocket closed')
      }, 100)
    }
  }

  isConnected(): boolean {
    return this.connected
  }
}

// Helper to convert base64 to ArrayBuffer (for frontend use)
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper to convert ArrayBuffer to base64 (for broadcasting)
export function arrayBufferToBase64(buffer: ArrayBuffer | Buffer): string {
  if (Buffer.isBuffer(buffer)) {
    return buffer.toString('base64')
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
