// Event types for Supabase Realtime

export type EventType =
  | 'processing:started'
  | 'tool:started'
  | 'tool:progress'
  | 'tool:completed'
  | 'response:chunk'
  | 'response:done'

export interface ProcessingStartedEvent {
  type: 'processing:started'
  turnId: string
  timestamp: number
}

export interface ToolStartedEvent {
  type: 'tool:started'
  turnId: string
  toolName: string
  toolCallId: string
  messageId: string // The assistant message this tool belongs to
}

export interface ToolProgressEvent {
  type: 'tool:progress'
  turnId: string
  toolName: string
  toolCallId: string
  progress: number // 0-100
  message?: string
}

export interface ToolCompletedEvent {
  type: 'tool:completed'
  turnId: string
  toolName: string
  toolCallId: string
  result?: unknown
}

export interface ResponseChunkEvent {
  type: 'response:chunk'
  turnId: string
  text: string
}

export interface ResponseDoneEvent {
  type: 'response:done'
  turnId: string
  messageId: string
}

export type RealtimeEvent =
  | ProcessingStartedEvent
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
  message_id?: string // References the assistant message this tool belongs to (optional for legacy data)
  tool_name: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  status: string
  duration_ms: number
  created_at: string
}
