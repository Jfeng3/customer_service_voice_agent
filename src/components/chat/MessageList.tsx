'use client'

import { useEffect, useRef } from 'react'
import type { MessageTurn, TurnToolCall } from '@/types/chat'

interface MessageListProps {
  turns: MessageTurn[]
  currentTurn: MessageTurn | null
  isLoading: boolean
}

export function MessageList({
  turns,
  currentTurn,
  isLoading,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  // Combine historical turns with current active turn
  const allTurns = [...turns]
  if (currentTurn && !turns.some(t => t.id === currentTurn.id)) {
    allTurns.push(currentTurn)
  } else if (currentTurn) {
    // Replace the matching turn with currentTurn (for live updates)
    const index = allTurns.findIndex(t => t.id === currentTurn.id)
    if (index !== -1) {
      allTurns[index] = currentTurn
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allTurns, currentTurn])

  const isEmpty = allTurns.length === 0

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
      {isEmpty ? (
        <WelcomeScreen />
      ) : (
        <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          {allTurns.map((turn, index) => (
            <TurnView
              key={turn.id}
              turn={turn}
              index={index}
            />
          ))}

          {isLoading && (!currentTurn || currentTurn.status === 'pending') && (
            <LoadingIndicator />
          )}

          <div ref={endRef} className="h-1" />
        </div>
      )}
    </div>
  )
}

interface TurnViewProps {
  turn: MessageTurn
  index: number
}

function TurnView({ turn, index }: TurnViewProps) {
  const isStreaming = turn.status === 'responding'
  const showAssistantBubble = turn.streamingResponse || turn.assistantResponse

  return (
    <div className="space-y-3">
      {/* User bubble */}
      <div
        className="flex justify-end animate-slide-in-right"
        style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
      >
        <div className="relative max-w-[90%] sm:max-w-[85%]">
          <UserBubble>{turn.userQuery}</UserBubble>
        </div>
      </div>

      {/* Tool cards */}
      {turn.toolCalls.length > 0 && (
        <div className="space-y-3 animate-fade-in-up">
          {turn.toolCalls.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>
      )}

      {/* Assistant bubble */}
      {showAssistantBubble && (
        <div className="flex justify-start animate-slide-in-left">
          <div className="relative max-w-[90%] sm:max-w-[85%]">
            <AssistantBubble streaming={isStreaming}>
              {turn.streamingResponse || turn.assistantResponse}
            </AssistantBubble>
          </div>
        </div>
      )}
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      <div className="relative mb-6 sm:mb-8">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl rotate-12 animate-float"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            boxShadow: 'var(--shadow-glow-accent)',
          }}
        />
        <div className="absolute inset-2 rounded-xl sm:rounded-2xl bg-[var(--surface)] flex items-center justify-center rotate-12">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent-primary)] -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--foreground)] mb-2 sm:mb-3">
        Welcome to Rainie Beauty
      </h2>
      <p className="text-sm sm:text-base text-[var(--foreground)] opacity-60 max-w-md mb-6 sm:mb-8 px-2">
        I&apos;m your front desk assistant. Book appointments, ask about our services, or get directions.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {['Book appointment', 'Our services', 'Find us'].map((action) => (
          <div key={action} className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[var(--border)] text-xs sm:text-sm text-[var(--foreground)] opacity-70 bg-[var(--surface)] shadow-[var(--shadow-soft)]">
            {action}
          </div>
        ))}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl rounded-br-md text-sm sm:text-base text-white whitespace-pre-wrap shadow-[var(--shadow-soft)]"
      style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #ff4757 100%)' }}
    >
      {children}
    </div>
  )
}

function AssistantBubble({ children, streaming }: { children: React.ReactNode; streaming?: boolean }) {
  return (
    <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-md bg-[var(--surface)] border border-[var(--border)] text-sm sm:text-base text-[var(--foreground)] whitespace-pre-wrap shadow-[var(--shadow-soft)]">
      {children}
      {streaming && (
        <span className="inline-block w-[2px] h-4 ml-1 bg-[var(--accent-primary)] animate-cursor-blink" />
      )}
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="relative max-w-[90%] sm:max-w-[85%]">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-md bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--accent-primary)] rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-[var(--foreground)] opacity-60 font-display">
              Processing...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tool styling config
const toolConfig: Record<string, { icon: React.ReactNode; label: string; gradient: string; accentColor: string; bgColor: string; borderColor: string }> = {
  knowledge_qa: {
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
    label: 'Knowledge Base',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    accentColor: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  web_search: {
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    label: 'Web Search',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    accentColor: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  web_fetch: {
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    label: 'Web Fetch',
    gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    accentColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  default: {
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    label: 'Tool',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    accentColor: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.08)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
}

function ToolCard({ tool, index }: { tool: TurnToolCall; index: number }) {
  const config = toolConfig[tool.toolName] || toolConfig.default
  const isInProgress = tool.status === 'running' || tool.status === 'pending'
  const query = tool.input?.query as string | undefined

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-fade-in-up"
      style={{ background: config.bgColor, border: `1px solid ${config.borderColor}`, animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
          style={{ background: config.gradient }}
        >
          {isInProgress ? (
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            config.icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-display font-medium text-xs sm:text-sm" style={{ color: config.accentColor }}>
              {config.label}
            </span>
            {tool.durationMs && (
              <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-40">
                {tool.durationMs}ms
              </span>
            )}
            {!isInProgress && (
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" style={{ color: config.accentColor }}>
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          {isInProgress && (
            <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out animate-progress-pulse"
                  style={{ width: `${tool.progress}%`, background: config.gradient }}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-50 tabular-nums w-7 sm:w-8 text-right">
                {tool.progress}%
              </span>
            </div>
          )}
          {isInProgress && tool.progressMessage && (
            <p className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-60 mt-1 truncate">
              {tool.progressMessage}
            </p>
          )}
        </div>
      </div>
      {!isInProgress && query && (
        <p className="mt-2 text-sm text-[var(--foreground)] opacity-60">
          Searched: <span className="font-medium opacity-80">&quot;{query}&quot;</span>
        </p>
      )}
    </div>
  )
}
