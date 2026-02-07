'use client'

import { useEffect } from 'react'

export type OrbState = 'idle' | 'listening' | 'transcribing' | 'speaking' | 'thinking'

interface VoiceOrbProps {
  state: OrbState
  isListening: boolean
  onStart: () => void
  onStop: () => void
  transcript: string
  disabled?: boolean
}

export function VoiceOrb({
  state,
  isListening,
  onStart,
  onStop,
  disabled = false,
}: VoiceOrbProps) {
  // Handle keyboard shortcut (hold space to talk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !disabled) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
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

  const getOrbStyles = () => {
    switch (state) {
      case 'listening':
        return {
          background: 'var(--gradient-orb-listening)',
          boxShadow: 'var(--shadow-glow-listening)',
          scale: 1.1,
        }
      case 'transcribing':
        return {
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
          boxShadow: '0 0 40px rgba(245, 158, 11, 0.4), 0 0 80px rgba(245, 158, 11, 0.2)',
          scale: 1,
        }
      case 'speaking':
        return {
          background: 'var(--gradient-orb-speaking)',
          boxShadow: 'var(--shadow-glow-speaking)',
          scale: 1,
        }
      case 'thinking':
        return {
          background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)',
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)',
          scale: 1,
        }
      default:
        return {
          background: 'var(--gradient-orb-idle)',
          boxShadow: 'var(--shadow-glow-accent)',
          scale: 1,
        }
    }
  }

  const orbStyles = getOrbStyles()

  const handleClick = () => {
    if (disabled) return
    if (isListening) {
      onStop()
    } else {
      onStart()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent the click event from also firing on mobile
    e.preventDefault()
    handleClick()
  }

  return (
    <div className="relative flex-shrink-0">
      {/* Outer glow ring - pointer-events-none so it doesn't block touches */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
          isListening ? 'animate-pulse-ring' : ''
        }`}
        style={{
          background: isListening
            ? 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,107,74,0.2) 0%, transparent 70%)',
          transform: 'scale(1.5)',
        }}
      />

      {/* Secondary pulse ring */}
      {isListening && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-ring pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 60%)',
            transform: 'scale(1.8)',
            animationDelay: '0.5s',
          }}
        />
      )}

      {/* Main orb button - Toggle mode: tap/click to start, tap/click again to stop */}
      <button
        type="button"
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        disabled={disabled}
        className={`
          relative w-14 h-14 sm:w-14 sm:h-14 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          focus-ring select-none
          touch-manipulation
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-90'}
          ${state === 'idle' ? 'animate-breathe' : ''}
        `}
        style={{
          background: orbStyles.background,
          boxShadow: orbStyles.boxShadow,
          transform: `scale(${orbStyles.scale})`,
        }}
        aria-label={isListening ? 'Click to stop recording' : 'Click to start recording'}
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-[3px] rounded-full opacity-40 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)',
          }}
        />

        {/* Icon */}
        {state === 'thinking' ? (
          <ThinkingIcon />
        ) : state === 'transcribing' ? (
          <TranscribingIcon />
        ) : state === 'speaking' ? (
          <SpeakingIcon />
        ) : (
          <MicrophoneIcon isActive={isListening} />
        )}

        {/* Rotating ring for active states */}
        {(state === 'listening' || state === 'transcribing' || state === 'speaking' || state === 'thinking') && (
          <div
            className="absolute inset-[-2px] rounded-full animate-orb-rotate pointer-events-none"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, ${
                state === 'listening'
                  ? 'rgba(220,38,38,0.6)'
                  : state === 'transcribing'
                  ? 'rgba(245,158,11,0.6)'
                  : state === 'speaking'
                  ? 'rgba(74,107,255,0.6)'
                  : 'rgba(139,92,246,0.6)'
              } 25%, transparent 50%)`,
              animationDuration: state === 'thinking' || state === 'transcribing' ? '2s' : '3s',
            }}
          />
        )}
      </button>
    </div>
  )
}

function MicrophoneIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      className={`w-5 h-5 sm:w-6 sm:h-6 text-white transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function SpeakingIcon() {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-[3px] bg-white rounded-full animate-wave-bar"
          style={{
            height: '16px',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

function ThinkingIcon() {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[5px] h-[5px] bg-white rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  )
}

function TranscribingIcon() {
  return (
    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}
