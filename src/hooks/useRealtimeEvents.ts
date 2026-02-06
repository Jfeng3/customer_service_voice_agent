'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { MessageTurn, TurnToolCall } from '@/types/chat'
import type { ToolCallRecord } from '@/types/events'

interface UseRealtimeEventsOptions {
  onProcessingStarted?: () => void
}

interface UseRealtimeEventsReturn {
  currentTurn: MessageTurn | null
  updateTurn: (turnId: string, updates: Partial<MessageTurn>) => void
  reset: () => void
}

export function useRealtimeEvents(
  sessionId: string | null,
  options?: UseRealtimeEventsOptions
): UseRealtimeEventsReturn {
  const [currentTurn, setCurrentTurn] = useState<MessageTurn | null>(null)

  const reset = useCallback(() => {
    setCurrentTurn(null)
  }, [])

  const updateTurn = useCallback((turnId: string, updates: Partial<MessageTurn>) => {
    setCurrentTurn(prev => {
      if (!prev || prev.id !== turnId) return prev
      return { ...prev, ...updates }
    })
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`session:${sessionId}`)
      // Processing started - cut TTS from previous message and create new turn
      .on('broadcast', { event: 'processing:started' }, ({ payload }) => {
        console.log('🚀 processing:started received:', payload)
        options?.onProcessingStarted?.()

        // Create new turn
        setCurrentTurn({
          id: payload.turnId,
          sessionId,
          createdAt: new Date().toISOString(),
          userQuery: '', // Will be filled by useChat
          toolCalls: [],
          status: 'pending',
        })
      })
      // Tool started - add new tool to turn
      .on('broadcast', { event: 'tool:started' }, ({ payload }) => {
        console.log('🔧 tool:started received:', payload)
        setCurrentTurn(prev => {
          if (!prev || prev.id !== payload.turnId) return prev

          const newTool: TurnToolCall = {
            id: payload.toolCallId,
            toolName: payload.toolName,
            input: {},
            status: 'running',
            progress: 0,
          }

          return {
            ...prev,
            status: 'tools_running',
            toolCalls: [...prev.toolCalls, newTool],
          }
        })
      })
      // Tool progress - update existing tool
      .on('broadcast', { event: 'tool:progress' }, ({ payload }) => {
        console.log('⏳ tool:progress received:', payload)
        setCurrentTurn(prev => {
          if (!prev || prev.id !== payload.turnId) return prev

          return {
            ...prev,
            toolCalls: prev.toolCalls.map(tool =>
              tool.id === payload.toolCallId
                ? { ...tool, progress: payload.progress, progressMessage: payload.message }
                : tool
            ),
          }
        })
      })
      // Tool completed - update status to completed
      .on('broadcast', { event: 'tool:completed' }, ({ payload }) => {
        console.log('✅ tool:completed received:', payload)
        setCurrentTurn(prev => {
          if (!prev || prev.id !== payload.turnId) return prev

          return {
            ...prev,
            toolCalls: prev.toolCalls.map(tool =>
              tool.id === payload.toolCallId
                ? { ...tool, status: 'completed', progress: 100 }
                : tool
            ),
          }
        })
      })
      // Response chunk - append to streaming response
      .on('broadcast', { event: 'response:chunk' }, ({ payload }) => {
        console.log('📝 response:chunk received:', payload.text?.slice(0, 50) + (payload.text?.length > 50 ? '...' : ''))
        setCurrentTurn(prev => {
          if (!prev || prev.id !== payload.turnId) return prev

          return {
            ...prev,
            status: 'responding',
            streamingResponse: (prev.streamingResponse || '') + payload.text,
          }
        })
      })
      // Response done - mark turn complete
      .on('broadcast', { event: 'response:done' }, ({ payload }) => {
        console.log('🏁 response:done received:', payload)
        setCurrentTurn(prev => {
          if (!prev || prev.id !== payload.turnId) return prev

          return {
            ...prev,
            status: 'complete',
            assistantResponse: prev.streamingResponse || '',
          }
        })
      })
      // DB insert - merge completed data into existing tool (for duration, output, etc.)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'csva_tool_calls',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('📥 postgres_changes received:', payload)
          const record = payload.new as ToolCallRecord
          console.log('📥 DB record:', {
            tool_call_id: record.tool_call_id,
            tool_name: record.tool_name,
          })
          setCurrentTurn(prev => {
            if (!prev) return prev

            return {
              ...prev,
              toolCalls: prev.toolCalls.map(tool =>
                tool.id === record.tool_call_id
                  ? {
                      ...tool,
                      output: record.output,
                      durationMs: record.duration_ms,
                      input: record.input,
                    }
                  : tool
              ),
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { currentTurn, updateTurn, reset }
}
