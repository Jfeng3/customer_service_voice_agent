'use client'

import { useEffect } from 'react'

interface VoiceInputProps {
  isListening: boolean
  onStart: () => void
  onStop: () => void
  transcript: string
  disabled?: boolean
}

export function VoiceInput({
  isListening,
  onStart,
  onStop,
  transcript,
  disabled = false,
}: VoiceInputProps) {
  // Handle keyboard shortcut (hold space to talk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !disabled) {
        // Prevent space from scrolling
        if (document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          onStart()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        onStop()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onStart, onStop, disabled])

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onMouseDown={onStart}
        onMouseUp={onStop}
        onMouseLeave={onStop}
        onTouchStart={onStart}
        onTouchEnd={onStop}
        disabled={disabled}
        className={`
          relative w-16 h-16 rounded-full transition-all duration-200
          flex items-center justify-center
          ${disabled
            ? 'bg-gray-300 cursor-not-allowed'
            : isListening
              ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
              : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
          }
        `}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
      >
        {/* Microphone icon */}
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>

        {/* Pulse animation when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-50" />
          </>
        )}
      </button>

      {/* Instructions */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {isListening ? 'Listening...' : 'Hold to speak'}
      </p>

      {/* Live transcript */}
      {transcript && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm max-w-xs text-center">
          {transcript}
        </div>
      )}
    </div>
  )
}
