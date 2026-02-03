// Chat message types

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls?: string[] // UUIDs of related tool calls
  created_at: string
}

export interface ToolCall {
  id: string
  session_id: string
  message_id?: string // References the assistant message this tool belongs to (optional for legacy data)
  tool_name: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  status: 'started' | 'completed' | 'failed'
  duration_ms?: number
  created_at: string
  completed_at?: string
}

export interface ChatSession {
  id: string
  messages: Message[]
  isLoading: boolean
  streamingMessage: string
}

// API request/response types
export interface ChatRequest {
  sessionId: string
  message: string
}

export interface ChatResponse {
  status: 'queued' | 'error'
  sessionId: string
  error?: string
}
