'use client'

import { useEffect, useRef } from 'react'
import type { Message } from '@/types/chat'
import type { ToolCallRecord } from '@/types/events'

interface MessageListProps {
  messages: Message[]
  toolCalls: ToolCallRecord[]
  streamingMessage: string
  isLoading: boolean
}

export function MessageList({
  messages,
  toolCalls,
  streamingMessage,
  isLoading,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolCalls, streamingMessage])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !streamingMessage && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p className="text-lg font-medium">Welcome to Customer Service</p>
          <p className="mt-2 text-sm">
            How can I help you today? You can type or use voice input.
          </p>
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Tool calls display */}
      {toolCalls.length > 0 && (
        <div className="space-y-2">
          {toolCalls.map((toolCall) => (
            <ToolCallBubble key={toolCall.id} toolCall={toolCall} />
          ))}
        </div>
      )}

      {/* Streaming message */}
      {streamingMessage && (
        <div className="flex justify-start">
          <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            {streamingMessage}
            <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !streamingMessage && toolCalls.length === 0 && (
        <div className="flex justify-start">
          <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] p-3 rounded-lg whitespace-pre-wrap
          ${isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  )
}

function ToolCallBubble({ toolCall }: { toolCall: ToolCallRecord }) {
  const query = toolCall.input?.query as string | undefined
  const results = toolCall.output?.results as Array<{ title: string; url: string; content: string }> | undefined

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🌐</span>
          <span className="font-medium text-blue-700 dark:text-blue-300">Web Search</span>
          <span className="text-xs text-blue-500 dark:text-blue-400">
            {toolCall.duration_ms}ms
          </span>
        </div>

        {query && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Searched: &quot;{query}&quot;
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {result.title}
                </a>
                <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                  {result.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
