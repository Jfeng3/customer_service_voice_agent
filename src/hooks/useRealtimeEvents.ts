'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ToolProgress } from '@/types/events'

interface UseRealtimeEventsReturn {
  toolProgress: ToolProgress | null
  streamingMessage: string
  isComplete: boolean
  reset: () => void
}

export function useRealtimeEvents(sessionId: string | null): UseRealtimeEventsReturn {
  const [toolProgress, setToolProgress] = useState<ToolProgress | null>(null)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const reset = useCallback(() => {
    setToolProgress(null)
    setStreamingMessage('')
    setIsComplete(false)
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`session:${sessionId}`)
      // Tool events
      .on('broadcast', { event: 'tool:started' }, ({ payload }) => {
        setToolProgress({
          toolName: payload.toolName,
          toolCallId: payload.toolCallId,
          status: 'started',
          progress: 0,
        })
      })
      .on('broadcast', { event: 'tool:progress' }, ({ payload }) => {
        setToolProgress({
          toolName: payload.toolName,
          toolCallId: payload.toolCallId,
          status: 'progress',
          progress: payload.progress,
          message: payload.message,
        })
      })
      .on('broadcast', { event: 'tool:completed' }, ({ payload }) => {
        setToolProgress({
          toolName: payload.toolName,
          toolCallId: payload.toolCallId,
          status: 'completed',
          progress: 100,
        })
        // Clear tool progress after a short delay
        setTimeout(() => setToolProgress(null), 2000)
      })
      // Response events
      .on('broadcast', { event: 'response:chunk' }, ({ payload }) => {
        setStreamingMessage(prev => prev + payload.text)
      })
      .on('broadcast', { event: 'response:done' }, () => {
        setIsComplete(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { toolProgress, streamingMessage, isComplete, reset }
}
