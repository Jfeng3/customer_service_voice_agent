'use client'

import { useState, useCallback, useEffect } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase/client'
import type { Message, ToolCall } from '@/types/chat'

interface UseChatReturn {
  messages: Message[]
  toolCalls: Record<string, ToolCall> // keyed by tool call ID
  isLoading: boolean
  sessionId: string
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  resetLoading: () => void
  error: string | null
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCall>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Generate sessionId only on client to avoid hydration mismatch
  useEffect(() => {
    setSessionId(nanoid())
  }, [])

  // Load existing messages and tool calls for this session
  useEffect(() => {
    if (!sessionId) return

    async function loadData() {
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('csva_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Failed to load messages:', messagesError)
        return
      }

      if (messagesData) {
        setMessages(messagesData)
      }

      // Load tool calls
      const { data: toolCallsData, error: toolCallsError } = await supabase
        .from('csva_tool_calls')
        .select('*')
        .eq('session_id', sessionId)

      if (toolCallsError) {
        console.error('Failed to load tool calls:', toolCallsError)
        return
      }

      if (toolCallsData) {
        const toolCallsMap: Record<string, ToolCall> = {}
        toolCallsData.forEach((tc) => {
          toolCallsMap[tc.id] = tc
        })
        setToolCalls(toolCallsMap)
      }
    }

    loadData()
  }, [sessionId])

  // Subscribe to new messages for this session
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'csva_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          console.log('📨 postgres_changes received:', newMessage.role, newMessage.id)

          // Ignore user messages from DB - we already have the optimistic one
          if (newMessage.role === 'user') {
            console.log('📨 Ignoring user message from DB')
            return
          }

          // Add assistant message (only if not duplicate)
          // Note: isLoading is reset via isComplete in ChatContainer, not here
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              console.log('📨 Duplicate message, skipping')
              return prev
            }
            console.log('📨 Adding assistant message, prev count:', prev.length)
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !sessionId) return

      setError(null)
      setIsLoading(true)

      // Optimistically add user message
      const tempMessage: Message = {
        id: `temp_${nanoid()}`,
        session_id: sessionId,
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString(),
      }
      console.log('📤 Adding optimistic message:', tempMessage.id, tempMessage.content)
      setMessages((prev) => {
        console.log('📤 Previous messages count:', prev.length)
        return [...prev, tempMessage]
      })

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to send message')
        }
      } catch (err) {
        console.error('Send message error:', err)
        setError(err instanceof Error ? err.message : 'Failed to send message')
        setIsLoading(false)

        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempMessage.id)
        )
      }
    },
    [sessionId]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const resetLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  return {
    messages,
    toolCalls,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
    resetLoading,
    error,
  }
}
