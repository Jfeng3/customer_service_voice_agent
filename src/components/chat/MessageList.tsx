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

function getToolIcon(toolName: string): string {
  switch (toolName) {
    case 'knowledge_qa':
      return '📚'
    case 'web_search':
      return '🌐'
    case 'web_fetch':
      return '📄'
    default:
      return '🔧'
  }
}

function getToolLabel(toolName: string): string {
  switch (toolName) {
    case 'knowledge_qa':
      return 'Knowledge Base'
    case 'web_search':
      return 'Web Search'
    case 'web_fetch':
      return 'Web Fetch'
    default:
      return toolName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
}

function getToolColors(toolName: string): { bg: string; border: string; text: string; accent: string } {
  switch (toolName) {
    case 'knowledge_qa':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        accent: 'text-purple-500 dark:text-purple-400'
      }
    case 'web_search':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
        accent: 'text-blue-500 dark:text-blue-400'
      }
    case 'web_fetch':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
        accent: 'text-green-500 dark:text-green-400'
      }
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
        accent: 'text-gray-500 dark:text-gray-400'
      }
  }
}

function ToolCallBubble({ toolCall }: { toolCall: ToolCallRecord }) {
  const query = toolCall.input?.query as string | undefined
  const results = toolCall.output?.results as Array<{ title: string; url: string; content: string }> | undefined
  const colors = getToolColors(toolCall.tool_name)

  return (
    <div className="flex justify-start">
      <div className={`max-w-[90%] p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{getToolIcon(toolCall.tool_name)}</span>
          <span className={`font-medium ${colors.text}`}>{getToolLabel(toolCall.tool_name)}</span>
          <span className={`text-xs ${colors.accent}`}>
            {toolCall.duration_ms}ms
          </span>
        </div>

        {query && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {toolCall.tool_name === 'knowledge_qa' ? 'Query' : 'Searched'}: &quot;{query}&quot;
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                {result.url ? (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {result.title}
                  </a>
                ) : (
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {result.title}
                  </span>
                )}
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
