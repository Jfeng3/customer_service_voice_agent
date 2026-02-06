'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase/client'
import type { Message, ToolCall, MessageTurn, TurnToolCall } from '@/types/chat'

interface UseChatReturn {
  messages: Message[]
  toolCalls: Record<string, ToolCall> // keyed by tool call ID
  turns: MessageTurn[]
  isLoading: boolean
  sessionId: string
  sendMessage: (content: string) => Promise<string | null> // Returns turnId
  clearMessages: () => void
  resetLoading: () => void
  error: string | null
}

// Convert DB ToolCall to TurnToolCall
function toTurnToolCall(tc: ToolCall): TurnToolCall {
  return {
    id: tc.id,
    toolName: tc.tool_name,
    input: tc.input,
    output: tc.output,
    status: tc.status === 'completed' ? 'completed' : tc.status === 'failed' ? 'error' : 'running',
    progress: tc.status === 'completed' ? 100 : 0,
    durationMs: tc.duration_ms,
  }
}

// Build turns from messages and tool calls using turn_id for grouping
function buildTurns(messages: Message[], toolCalls: Record<string, ToolCall>): MessageTurn[] {
  const turnMap = new Map<string, { user?: Message; assistant?: Message }>()

  // Group messages by turn_id
  for (const msg of messages) {
    const turnId = msg.turn_id
    if (!turnId) continue // Skip messages without turn_id

    if (!turnMap.has(turnId)) {
      turnMap.set(turnId, {})
    }
    const turn = turnMap.get(turnId)!
    if (msg.role === 'user') {
      turn.user = msg
    } else {
      turn.assistant = msg
    }
  }

  // Convert to MessageTurn array, sorted by user message created_at
  const turns: MessageTurn[] = []
  for (const [turnId, { user, assistant }] of turnMap) {
    if (!user) continue // Must have a user message

    // Get tool calls for the assistant message
    const turnToolCalls = assistant
      ? Object.values(toolCalls)
          .filter(tc => tc.message_id === assistant.id)
          .map(toTurnToolCall)
      : []

    turns.push({
      id: turnId,
      sessionId: user.session_id,
      createdAt: user.created_at,
      userQuery: user.content,
      toolCalls: turnToolCalls,
      assistantResponse: assistant?.content,
      status: assistant ? 'complete' : 'pending',
    })
  }

  // Sort by created_at
  turns.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return turns
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [toolCalls, setToolCalls] = useState<Record<string, ToolCall>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Build turns from messages and tool calls
  const turns = useMemo(
    () => buildTurns(messages, toolCalls),
    [messages, toolCalls]
  )

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
    async (content: string): Promise<string | null> => {
      if (!content.trim() || !sessionId) return null

      setError(null)
      setIsLoading(true)

      // Generate turnId for grouping user + assistant messages
      const turnId = `turn_${nanoid()}`

      // Optimistically add user message
      const tempMessage: Message = {
        id: `temp_${nanoid()}`, // Temporary id for React key
        session_id: sessionId,
        turn_id: turnId,
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
            turnId,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to send message')
        }

        return turnId
      } catch (err) {
        console.error('Send message error:', err)
        setError(err instanceof Error ? err.message : 'Failed to send message')
        setIsLoading(false)

        // Remove optimistic message on error (by turn_id)
        setMessages((prev) =>
          prev.filter((m) => m.turn_id !== turnId)
        )
        return null
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
    turns,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
    resetLoading,
    error,
  }
}
