'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseVoiceReturn {
  // Speech-to-text
  isListening: boolean
  isTranscribing: boolean
  transcript: string
  startListening: () => void
  stopListening: () => Promise<string>
  clearTranscript: () => void

  // Text-to-speech
  isSpeaking: boolean
  speak: (text: string) => Promise<void>
  stopSpeaking: () => void

  // Streaming TTS (Web Audio API)
  playAudioChunk: (base64Audio: string) => Promise<void>
  clearAudioQueue: () => void

  // Errors
  error: string | null
  isSupported: boolean
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Web Audio API refs for streaming playback
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)
  const nextStartTimeRef = useRef(0)

  // Check browser support for MediaRecorder
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
      setError('Audio recording not supported in this browser')
    }
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    setTranscript('')
    audioChunksRef.current = []

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })
      streamRef.current = stream

      // Create MediaRecorder with webm/opus format (best compatibility)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsListening(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to access microphone. Please allow microphone access.')
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsListening(false)
        resolve('')
        return
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsListening(false)
        setIsTranscribing(true)

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        audioChunksRef.current = []

        // Skip if too short (less than 0.5 seconds of audio)
        if (audioBlob.size < 5000) {
          setIsTranscribing(false)
          resolve('')
          return
        }

        try {
          // Send to Deepgram API
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const response = await fetch('/api/voice/input', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            throw new Error('Transcription failed')
          }

          const data = await response.json()
          const transcriptText = data.transcript || ''

          setTranscript(transcriptText)
          setIsTranscribing(false)
          resolve(transcriptText)
        } catch (err) {
          console.error('Transcription error:', err)
          setError('Failed to transcribe audio')
          setIsTranscribing(false)
          resolve('')
        }
      }

      mediaRecorderRef.current.stop()
    })
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Text-to-speech using ElevenLabs API
  const speak = useCallback(async (text: string) => {
    setError(null)
    setIsSpeaking(true)

    try {
      const response = await fetch('/api/voice/output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('TTS request failed')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Play audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        setError('Failed to play audio')
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setError('Failed to convert text to speech')
      setIsSpeaking(false)
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsSpeaking(false)
    }
  }, [])

  // Helper to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }, [])

  // Play next audio buffer from queue with gapless playback
  const scheduleNextChunk = useCallback(() => {
    const ctx = audioContextRef.current
    const buffer = audioQueueRef.current.shift()

    if (!ctx || !buffer) {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false
        setIsSpeaking(false)
      }
      return
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    // Schedule playback at the exact end time of the previous chunk for gapless audio
    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current)
    source.start(startTime)
    nextStartTimeRef.current = startTime + buffer.duration

    source.onended = () => {
      // Check if there are more chunks to play
      if (audioQueueRef.current.length > 0) {
        scheduleNextChunk()
      } else {
        // Small delay before marking as not speaking to handle late arrivals
        setTimeout(() => {
          if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false
            setIsSpeaking(false)
          }
        }, 100)
      }
    }
  }, [])

  // Play incoming audio chunk from base64
  const playAudioChunk = useCallback(async (base64Audio: string) => {
    try {
      // Initialize AudioContext on first call (must be after user interaction)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
        nextStartTimeRef.current = 0
      }

      // Resume if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const audioData = base64ToArrayBuffer(base64Audio)
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0))
      audioQueueRef.current.push(audioBuffer)

      // Start playing if not already
      if (!isPlayingRef.current) {
        isPlayingRef.current = true
        setIsSpeaking(true)
        scheduleNextChunk()
      }
    } catch (err) {
      console.error('Failed to play audio chunk:', err)
    }
  }, [base64ToArrayBuffer, scheduleNextChunk])

  // Clear audio queue (for interruption)
  const clearAudioQueue = useCallback(() => {
    audioQueueRef.current = []
    isPlayingRef.current = false
    nextStartTimeRef.current = 0
    setIsSpeaking(false)

    // Stop any currently playing audio by closing and recreating context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isListening,
    isTranscribing,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    playAudioChunk,
    clearAudioQueue,
    error,
    isSupported,
  }
}
