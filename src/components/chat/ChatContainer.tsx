'use client'

import { useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { useVoice } from '@/hooks/useVoice'
import { MessageList } from './MessageList'
import { InputArea } from './InputArea'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { VoiceIndicator } from '@/components/voice/VoiceIndicator'

export function ChatContainer() {
  const { messages, isLoading, sessionId, sendMessage, error } = useChat()
  const { toolProgress, toolCalls, streamingMessage, isComplete, reset } = useRealtimeEvents(sessionId || null)
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    isSupported: voiceSupported,
  } = useVoice()

  // Auto-speak assistant responses when complete (don't reset yet)
  useEffect(() => {
    if (isComplete && streamingMessage) {
      speak(streamingMessage)
    }
  }, [isComplete, streamingMessage, speak])

  // Reset only when assistant message appears in messages array via postgres_changes
  useEffect(() => {
    if (isComplete && streamingMessage) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.role === 'assistant') {
        reset()
      }
    }
  }, [isComplete, streamingMessage, messages, reset])

  // Send voice transcript as message
  const handleVoiceStop = () => {
    stopListening()
    if (transcript.trim()) {
      sendMessage(transcript.trim())
      clearTranscript()
    }
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Customer Service
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Session: {sessionId ? `${sessionId.slice(0, 8)}...` : 'Loading...'}
            </p>
          </div>
          <VoiceIndicator isListening={isListening} isSpeaking={isSpeaking} />
        </header>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Messages */}
        <MessageList
          messages={messages}
          toolCalls={toolCalls}
          toolProgress={toolProgress}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
        />

        {/* Input area */}
        <div className="flex items-end gap-4 p-4 border-t dark:border-gray-700">
          <div className="flex-1">
            <InputArea
              onSend={sendMessage}
              disabled={isLoading || isListening}
            />
          </div>

          {/* Voice input */}
          {voiceSupported && (
            <div className="flex-shrink-0">
              <VoiceInput
                isListening={isListening}
                onStart={startListening}
                onStop={handleVoiceStop}
                transcript={transcript}
                disabled={isLoading || isSpeaking}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
