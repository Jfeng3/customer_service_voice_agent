'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { useVoice } from '@/hooks/useVoice'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'
import { VoiceOrb } from '@/components/voice/VoiceOrb'
import { StatusBadge } from '@/components/voice/StatusBadge'

export function ChatContainer() {
  const { messages, toolCalls, isLoading, sessionId, sendMessage, resetLoading, error } = useChat()
  const { tools, streamingMessage, isComplete, reset } = useRealtimeEvents(sessionId || null)
  const {
    isListening,
    isTranscribing,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    isSupported: voiceSupported,
  } = useVoice()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-speak assistant responses when complete
  useEffect(() => {
    if (isComplete && streamingMessage) {
      speak(streamingMessage)
    }
  }, [isComplete, streamingMessage, speak])

  // Reset only when assistant message appears in messages array
  useEffect(() => {
    if (isComplete && streamingMessage) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        reset()
      }
    }
  }, [isComplete, streamingMessage, messages, reset])

  // Reset isLoading when response is complete
  // This is the primary mechanism since postgres_changes on csva_messages may not be enabled
  useEffect(() => {
    if (isComplete) {
      resetLoading()
    }
  }, [isComplete, resetLoading])

  // Send voice transcript as message
  const handleVoiceStop = async () => {
    const transcribedText = await stopListening()
    if (transcribedText.trim()) {
      sendMessage(transcribedText.trim())
      clearTranscript()
    }
  }

  // Determine current state for orb
  const getOrbState = () => {
    if (isListening) return 'listening'
    if (isTranscribing) return 'transcribing'
    if (isSpeaking) return 'speaking'
    if (isLoading) return 'thinking'
    return 'idle'
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large gradient orbs in background */}
        <div
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full opacity-30 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,74,0.15) 0%, transparent 70%)',
            animationDuration: '20s',
          }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-20 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(74,107,255,0.15) 0%, transparent 70%)',
            animationDuration: '25s',
            animationDelay: '-5s',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Logo mark */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[var(--foreground)] truncate">
                Rainie Beauty
              </h1>
              <p className="text-xs sm:text-sm text-[var(--foreground)] opacity-50 font-display truncate">
                {sessionId ? 'Front Desk Assistant' : 'Connecting...'}
              </p>
            </div>
          </div>

          <StatusBadge
            state={getOrbState()}
            onStopSpeaking={stopSpeaking}
          />
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mb-3 sm:mb-4 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in-up">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            historicalToolCalls={toolCalls}
            activeTools={tools}
            streamingMessage={streamingMessage}
            isLoading={isLoading}
          />
        </div>

        {/* Input area with voice orb */}
        <div className={`relative px-3 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
          {/* Glass container for input */}
          <div className="relative glass rounded-2xl sm:rounded-3xl border border-[var(--border)] shadow-[var(--shadow-elevated)]">
            <div className="flex items-end gap-2 sm:gap-4 p-2 sm:p-4">
              {/* Text input */}
              <div className="flex-1 min-w-0">
                <InputArea
                  onSend={sendMessage}
                  disabled={isLoading || isListening || isTranscribing}
                />
              </div>

              {/* Voice orb */}
              {voiceSupported && (
                <VoiceOrb
                  state={getOrbState()}
                  isListening={isListening}
                  onStart={startListening}
                  onStop={handleVoiceStop}
                  transcript={transcript}
                  disabled={isLoading || isSpeaking || isTranscribing}
                />
              )}
            </div>

            {/* Transcript preview */}
            {transcript && (
              <div className="px-2 sm:px-4 pb-2 sm:pb-4 -mt-1 sm:-mt-2 animate-fade-in">
                <div className="px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)]/20">
                  <p className="text-xs sm:text-sm text-[var(--foreground)] opacity-80 font-medium">
                    <span className="text-[var(--accent-primary)] mr-1 sm:mr-2">Heard:</span>
                    {transcript}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hint text - hidden on mobile */}
          <p className="hidden sm:block text-center text-xs text-[var(--foreground)] opacity-40 mt-3 font-display">
            Press Enter to send or hold the orb to speak
          </p>
        </div>
      </div>
    </div>
  )
}
