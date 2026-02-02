'use client'

import type { OrbState } from './VoiceOrb'

interface StatusBadgeProps {
  state: OrbState
  onStopSpeaking?: () => void
}

export function StatusBadge({ state, onStopSpeaking }: StatusBadgeProps) {
  if (state === 'idle') return null

  const getConfig = () => {
    switch (state) {
      case 'listening':
        return {
          label: 'Listening',
          color: 'bg-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          textColor: 'text-red-600 dark:text-red-400',
        }
      case 'speaking':
        return {
          label: 'Speaking',
          color: 'bg-[var(--accent-secondary)]',
          bgColor: 'bg-[var(--accent-secondary-soft)]',
          borderColor: 'border-[var(--accent-secondary)]/20',
          textColor: 'text-[var(--accent-secondary)]',
        }
      case 'thinking':
        return {
          label: 'Thinking',
          color: 'bg-violet-500',
          bgColor: 'bg-violet-500/10',
          borderColor: 'border-violet-500/20',
          textColor: 'text-violet-600 dark:text-violet-400',
        }
      default:
        return null
    }
  }

  const config = getConfig()
  if (!config) return null

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        ${config.bgColor} border ${config.borderColor}
        animate-fade-in
      `}
    >
      {/* Animated indicator */}
      <div className="flex items-center gap-[3px] h-4">
        {state === 'listening' || state === 'speaking' ? (
          // Wave bars for audio states
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-[3px] rounded-full ${config.color} animate-wave-bar`}
                style={{
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </>
        ) : (
          // Pulse dots for thinking
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-[5px] h-[5px] rounded-full ${config.color} animate-bounce`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Status text */}
      <span className={`text-sm font-medium font-display ${config.textColor}`}>
        {config.label}
      </span>

      {/* Stop button for speaking */}
      {state === 'speaking' && onStopSpeaking && (
        <button
          type="button"
          onClick={onStopSpeaking}
          className={`
            ml-1 p-1 rounded-full transition-colors
            hover:bg-[var(--accent-secondary)]/20
          `}
          aria-label="Stop speaking"
        >
          <svg
            className="w-3 h-3 text-[var(--accent-secondary)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      )}
    </div>
  )
}
