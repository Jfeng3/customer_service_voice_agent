'use client'

import { useEffect, useRef } from 'react'
import type { Message, ToolCall } from '@/types/chat'
import type { UnifiedToolState } from '@/hooks/useRealtimeEvents'

interface MessageListProps {
  messages: Message[]
  historicalToolCalls: Record<string, ToolCall>
  activeTools: UnifiedToolState[]
  streamingMessage: string
  isLoading: boolean
}

export function MessageList({
  messages,
  historicalToolCalls,
  activeTools,
  streamingMessage,
  isLoading,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTools, streamingMessage])

  const isEmpty = messages.length === 0 && !streamingMessage

  // Render a message with its associated tool calls (if assistant message)
  const renderMessageWithTools = (message: Message, index: number) => {
    const elements = []

    // For assistant messages, render tool calls first
    if (message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      const toolsForMessage = message.tool_calls
        .map((tcId) => historicalToolCalls[tcId])
        .filter(Boolean)

      if (toolsForMessage.length > 0) {
        elements.push(
          <div key={`tools-${message.id}`} className="space-y-3">
            {toolsForMessage.map((tc, tcIndex) => (
              <HistoricalToolCard key={tc.id} toolCall={tc} index={tcIndex} />
            ))}
          </div>
        )
      }
    }

    // Then render the message
    elements.push(
      <MessageBubble key={message.id} message={message} index={index} />
    )

    return elements
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
      {isEmpty ? (
        <WelcomeScreen />
      ) : (
        <div className="space-y-3 sm:space-y-4 max-w-3xl mx-auto">
          {messages.flatMap((message, index) => renderMessageWithTools(message, index))}

          {/* Active tools display (for current request) */}
          {activeTools.length > 0 && (
            <div className="space-y-3 animate-fade-in-up">
              {activeTools.map((tool, index) => (
                <ToolCard key={tool.toolCallId} tool={tool} index={index} />
              ))}
            </div>
          )}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="relative max-w-[90%] sm:max-w-[85%]">
                <AssistantBubble>
                  {streamingMessage}
                  <span className="inline-block w-[2px] h-4 ml-1 bg-[var(--accent-primary)] animate-cursor-blink" />
                </AssistantBubble>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingMessage && activeTools.length === 0 && (
            <div className="flex justify-start animate-fade-in-up">
              <div className="relative max-w-[90%] sm:max-w-[85%]">
                <AssistantBubble>
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
                      Processing your request...
                    </span>
                  </div>
                </AssistantBubble>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      )}
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      {/* Decorative element */}
      <div className="relative mb-6 sm:mb-8">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl rotate-12 animate-float"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            boxShadow: 'var(--shadow-glow-accent)',
          }}
        />
        <div
          className="absolute inset-2 rounded-xl sm:rounded-2xl bg-[var(--surface)] flex items-center justify-center rotate-12"
        >
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--accent-primary)] -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>

      <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--foreground)] mb-2 sm:mb-3">
        Welcome to Rainie Beauty
      </h2>
      <p className="text-sm sm:text-base text-[var(--foreground)] opacity-60 max-w-md mb-6 sm:mb-8 px-2">
        I&apos;m your front desk assistant. Book appointments, ask about our services, or get directions to our salon.
      </p>

      {/* Quick action chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {['Book appointment', 'Our services', 'Find us'].map((action, i) => (
          <div
            key={action}
            className={`
              px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[var(--border)]
              text-xs sm:text-sm text-[var(--foreground)] opacity-70
              bg-[var(--surface)] shadow-[var(--shadow-soft)]
              animate-fade-in-up stagger-${i + 1}
            `}
          >
            {action}
          </div>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message, index }: { message: Message; index: number }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isUser ? 'animate-slide-in-right' : 'animate-slide-in-left'
      }`}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
    >
      <div className="relative max-w-[90%] sm:max-w-[85%]">
        {isUser ? (
          <UserBubble>{message.content}</UserBubble>
        ) : (
          <AssistantBubble>{message.content}</AssistantBubble>
        )}
      </div>
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl rounded-br-md
        text-sm sm:text-base text-white whitespace-pre-wrap
        shadow-[var(--shadow-soft)]
      "
      style={{
        background: 'linear-gradient(135deg, var(--accent-primary) 0%, #ff4757 100%)',
      }}
    >
      {children}
    </div>
  )
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl rounded-bl-md
        bg-[var(--surface)] border border-[var(--border)]
        text-sm sm:text-base text-[var(--foreground)] whitespace-pre-wrap
        shadow-[var(--shadow-soft)]
      "
    >
      {children}
    </div>
  )
}

// Tool styling configuration
const toolConfig: Record<string, {
  icon: React.ReactNode
  label: string
  gradient: string
  accentColor: string
  bgColor: string
  borderColor: string
}> = {
  knowledge_qa: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    label: 'Knowledge Base',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    accentColor: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  web_search: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: 'Web Search',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    accentColor: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  web_fetch: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Web Fetch',
    gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    accentColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  default: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Tool',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
    accentColor: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.08)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
}

interface WebSearchResult {
  title: string
  url: string
  content: string
  score?: number
}

interface KnowledgeResult {
  content: string
  category: string
  similarity: number
}

function ToolCard({ tool, index }: { tool: UnifiedToolState; index: number }) {
  const { toolName: broadcastToolName, status, progress, message, completed } = tool
  const toolName = completed?.tool_name || broadcastToolName
  const isInProgress = status !== 'completed' || !completed
  const config = toolConfig[toolName] || toolConfig.default

  const renderResults = () => {
    if (!completed) return null

    const query = completed.input?.query as string | undefined

    if (toolName === 'knowledge_qa') {
      const results = completed.output?.results as KnowledgeResult[] | undefined
      return (
        <div className="mt-3 space-y-2">
          {query && (
            <p className="text-sm text-[var(--foreground)] opacity-60">
              Searched: <span className="font-medium opacity-80">&quot;{query}&quot;</span>
            </p>
          )}
          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.slice(0, 3).map((result, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: config.bgColor,
                        color: config.accentColor,
                      }}
                    >
                      {result.category}
                    </span>
                    <span className="text-xs text-[var(--foreground)] opacity-40">
                      {Math.round(result.similarity * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] opacity-80 line-clamp-3">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // web_search and web_fetch results
    const results = completed.output?.results as WebSearchResult[] | undefined
    return (
      <div className="mt-3 space-y-2">
        {query && (
          <p className="text-sm text-[var(--foreground)] opacity-60">
            Searched: <span className="font-medium opacity-80">&quot;{query}&quot;</span>
          </p>
        )}
        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.slice(0, 3).map((result, idx) => (
              <a
                key={idx}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                  shadow-sm hover:shadow-md transition-shadow group
                "
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate group-hover:underline"
                      style={{ color: config.accentColor }}
                    >
                      {result.title}
                    </p>
                    <p className="text-xs text-[var(--foreground)] opacity-50 truncate mt-0.5">
                      {result.url}
                    </p>
                    <p className="text-sm text-[var(--foreground)] opacity-70 line-clamp-2 mt-1">
                      {result.content}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-[var(--foreground)] opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4 animate-fade-in-up"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon with gradient background */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
          style={{ background: config.gradient }}
        >
          {isInProgress ? (
            <div
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
          ) : (
            config.icon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="font-display font-medium text-xs sm:text-sm"
              style={{ color: config.accentColor }}
            >
              {config.label}
            </span>
            {completed && (
              <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-40">
                {completed.duration_ms}ms
              </span>
            )}
            {!isInProgress && (
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: config.accentColor }}
              >
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Progress bar */}
          {isInProgress && (
            <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out animate-progress-pulse"
                  style={{
                    width: `${progress}%`,
                    background: config.gradient,
                  }}
                />
              </div>
              <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-50 tabular-nums w-7 sm:w-8 text-right">
                {progress}%
              </span>
            </div>
          )}

          {/* Status message */}
          {isInProgress && message && (
            <p className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-60 mt-1 truncate">
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {renderResults()}
    </div>
  )
}

// Historical tool call card (for completed tools from DB)
function HistoricalToolCard({ toolCall, index }: { toolCall: ToolCall; index: number }) {
  const toolName = toolCall.tool_name
  const config = toolConfig[toolName] || toolConfig.default

  const renderResults = () => {
    const query = toolCall.input?.query as string | undefined

    if (toolName === 'knowledge_qa') {
      const results = toolCall.output?.results as KnowledgeResult[] | undefined
      return (
        <div className="mt-3 space-y-2">
          {query && (
            <p className="text-sm text-[var(--foreground)] opacity-60">
              Searched: <span className="font-medium opacity-80">&quot;{query}&quot;</span>
            </p>
          )}
          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.slice(0, 3).map((result, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: config.bgColor,
                        color: config.accentColor,
                      }}
                    >
                      {result.category}
                    </span>
                    <span className="text-xs text-[var(--foreground)] opacity-40">
                      {Math.round(result.similarity * 100)}% match
                    </span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] opacity-80 line-clamp-3">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // web_search and web_fetch results
    const results = toolCall.output?.results as WebSearchResult[] | undefined
    return (
      <div className="mt-3 space-y-2">
        {query && (
          <p className="text-sm text-[var(--foreground)] opacity-60">
            Searched: <span className="font-medium opacity-80">&quot;{query}&quot;</span>
          </p>
        )}
        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.slice(0, 3).map((result, idx) => (
              <a
                key={idx}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  block p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]
                  shadow-sm hover:shadow-md transition-shadow group
                "
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate group-hover:underline"
                      style={{ color: config.accentColor }}
                    >
                      {result.title}
                    </p>
                    <p className="text-xs text-[var(--foreground)] opacity-50 truncate mt-0.5">
                      {result.url}
                    </p>
                    <p className="text-sm text-[var(--foreground)] opacity-70 line-clamp-2 mt-1">
                      {result.content}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-[var(--foreground)] opacity-30 group-hover:opacity-60 transition-opacity flex-shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl sm:rounded-2xl p-3 sm:p-4"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon with gradient background */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
          style={{ background: config.gradient }}
        >
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="font-display font-medium text-xs sm:text-sm"
              style={{ color: config.accentColor }}
            >
              {config.label}
            </span>
            {toolCall.duration_ms && (
              <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-40">
                {toolCall.duration_ms}ms
              </span>
            )}
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: config.accentColor }}
            >
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Results */}
      {renderResults()}
    </div>
  )
}
