// Event types for Supabase Realtime

export type EventType =
  | 'tool:started'
  | 'tool:progress'
  | 'tool:completed'
  | 'response:chunk'
  | 'response:done'

export interface ToolStartedEvent {
  type: 'tool:started'
  toolName: string
  toolCallId: string
}

export interface ToolProgressEvent {
  type: 'tool:progress'
  toolName: string
  toolCallId: string
  progress: number // 0-100
  message?: string
}

export interface ToolCompletedEvent {
  type: 'tool:completed'
  toolName: string
  toolCallId: string
  result?: unknown
}

export interface ResponseChunkEvent {
  type: 'response:chunk'
  text: string
}

export interface ResponseDoneEvent {
  type: 'response:done'
  messageId: string
}

export type RealtimeEvent =
  | ToolStartedEvent
  | ToolProgressEvent
  | ToolCompletedEvent
  | ResponseChunkEvent
  | ResponseDoneEvent

// Tool progress state for UI
export interface ToolProgress {
  toolName: string
  toolCallId: string
  status: 'started' | 'progress' | 'completed'
  progress: number
  message?: string
}

// Tool call record from database
export interface ToolCallRecord {
  id: string
  tool_call_id: string
  session_id: string
  tool_name: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  status: string
  duration_ms: number
  created_at: string
}
