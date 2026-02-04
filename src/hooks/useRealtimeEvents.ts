'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ToolCallRecord } from '@/types/events'

// Unified tool state - tracks both progress and completed results
export interface UnifiedToolState {
  toolCallId: string
  toolName: string
  messageId: string // The assistant message this tool belongs to
  status: 'started' | 'progress' | 'completed'
  progress: number
  message?: string
  // Completed data (from DB)
  completed?: ToolCallRecord
}

interface UseRealtimeEventsOptions {
  onProcessingStarted?: () => void
}

interface UseRealtimeEventsReturn {
  tools: UnifiedToolState[]
  streamingMessage: string
  isComplete: boolean
  reset: () => void
}

export function useRealtimeEvents(
  sessionId: string | null,
  options?: UseRealtimeEventsOptions
): UseRealtimeEventsReturn {
  const [tools, setTools] = useState<UnifiedToolState[]>([])
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const reset = useCallback(() => {
    setTools([])
    setStreamingMessage('')
    setIsComplete(false)
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`session:${sessionId}`)
      // Processing started - cut TTS from previous message
      .on('broadcast', { event: 'processing:started' }, () => {
        console.log('🚀 processing:started received - cutting TTS')
        options?.onProcessingStarted?.()
      })
      // Tool started - add new tool to list
      .on('broadcast', { event: 'tool:started' }, ({ payload }) => {
        console.log('🔧 tool:started received:', payload)
        setTools(prev => [
          ...prev,
          {
            toolCallId: payload.toolCallId,
            toolName: payload.toolName,
            messageId: payload.messageId, // Track which message this tool belongs to
            status: 'started',
            progress: 0,
          }
        ])
      })
      // Tool progress - update existing tool
      .on('broadcast', { event: 'tool:progress' }, ({ payload }) => {
        setTools(prev => prev.map(tool =>
          tool.toolCallId === payload.toolCallId
            ? { ...tool, status: 'progress', progress: payload.progress, message: payload.message }
            : tool
        ))
      })
      // Tool completed - update status to completed
      .on('broadcast', { event: 'tool:completed' }, ({ payload }) => {
        setTools(prev => prev.map(tool =>
          tool.toolCallId === payload.toolCallId
            ? { ...tool, status: 'completed', progress: 100 }
            : tool
        ))
      })
      // Response events
      .on('broadcast', { event: 'response:chunk' }, ({ payload }) => {
        setStreamingMessage(prev => prev + payload.text)
      })
      .on('broadcast', { event: 'response:done' }, () => {
        setIsComplete(true)
      })
      // DB insert - merge completed data into existing tool
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
          setTools(prev => {
            console.log('📥 Matching against tools:', prev.map(t => ({ toolCallId: t.toolCallId, toolName: t.toolName })))
            return prev.map(tool =>
              tool.toolCallId === record.tool_call_id
                ? { ...tool, completed: record }
                : tool
            )
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { tools, streamingMessage, isComplete, reset }
}
