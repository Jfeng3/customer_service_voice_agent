'use client'

interface VoiceIndicatorProps {
  isListening: boolean
  isSpeaking: boolean
}

export function VoiceIndicator({ isListening, isSpeaking }: VoiceIndicatorProps) {
  if (!isListening && !isSpeaking) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
      {/* Animated bars */}
      <div className="flex items-center gap-0.5 h-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`
              w-1 rounded-full transition-all
              ${isListening ? 'bg-red-500' : 'bg-blue-500'}
            `}
            style={{
              height: `${Math.random() * 100}%`,
              animation: `voiceBar 0.5s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {isListening ? 'Listening...' : 'Speaking...'}
      </span>

      {/* Stop button */}
      <button
        type="button"
        className="ml-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
        aria-label="Stop"
      >
        <svg
          className="w-4 h-4 text-gray-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes voiceBar {
          0%, 100% {
            height: 20%;
          }
          50% {
            height: 100%;
          }
        }
      `}</style>
    </div>
  )
}
