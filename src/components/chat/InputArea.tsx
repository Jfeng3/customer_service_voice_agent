'use client'

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from 'react'

interface InputAreaProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function InputArea({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: InputAreaProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const hasInput = input.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`
            w-full resize-none rounded-2xl
            bg-transparent
            px-4 py-3
            text-[var(--foreground)]
            placeholder:text-[var(--foreground)] placeholder:opacity-40
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
          style={{
            minHeight: '48px',
            maxHeight: '120px',
          }}
        />
      </div>

      {/* Send button */}
      <button
        type="submit"
        disabled={disabled || !hasInput}
        className={`
          relative flex-shrink-0
          w-12 h-12 rounded-2xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          focus-ring
          ${disabled || !hasInput
            ? 'bg-[var(--border)] cursor-not-allowed'
            : 'bg-gradient-to-br from-[var(--accent-primary)] to-[#ff4757] hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
          }
        `}
        aria-label="Send message"
      >
        {/* Send icon */}
        <svg
          className={`w-5 h-5 transition-all duration-200 ${
            hasInput && !disabled ? 'text-white' : 'text-[var(--foreground)] opacity-30'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>

        {/* Highlight effect */}
        {hasInput && !disabled && (
          <div
            className="absolute inset-[2px] rounded-xl opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
            }}
          />
        )}
      </button>
    </form>
  )
}
