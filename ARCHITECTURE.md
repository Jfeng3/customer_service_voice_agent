# Architecture

## System Overview

Voice-enabled front desk assistant for Rainie Beauty salon. Users interact via text or voice, messages are processed asynchronously through a queue, and responses stream back in real-time.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  Frontend                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   useChat    │  │useRealtime   │  │   useVoice   │  │ MessageList  │     │
│  │              │  │   Events     │  │              │  │              │     │
│  │ • Optimistic │  │ • Tool state │  │ • Deepgram   │  │ • Messages   │     │
│  │   messages   │  │ • Streaming  │  │   STT        │  │ • Tools      │     │
│  │ • Send API   │  │ • Broadcast  │  │ • ElevenLabs │  │ • Streaming  │     │
│  └──────┬───────┘  └──────┬───────┘  │   TTS        │  └──────────────┘     │
│         │                 │          └──────────────┘                        │
└─────────┼─────────────────┼──────────────────────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                       │
│  ┌──────────────┐                              ┌──────────────────────────┐  │
│  │  /api/chat   │ ──── Queue Message ────────▶ │     QStash (Upstash)     │  │
│  │              │                              │                          │  │
│  │ • Validate   │                              │ • Reliable delivery      │  │
│  │ • Save user  │                              │ • Signature verification │  │
│  │   message    │                              │ • Retry on failure       │  │
│  └──────────────┘                              └────────────┬─────────────┘  │
│                                                              │               │
│                                                              ▼               │
│                                                ┌──────────────────────────┐  │
│                                                │  /api/qstash/webhook     │  │
│                                                │                          │  │
│                                                │ • Load history           │  │
│                                                │ • Retrieve memories      │  │
│                                                │ • Call OpenRouter        │  │
│                                                │ • Execute tools          │  │
│                                                │ • Broadcast events       │  │
│                                                │ • Save response          │  │
│                                                │ • Extract memories       │  │
│                                                └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                                    │
          ▼                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           External Services                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Supabase    │  │  OpenRouter  │  │  ElevenLabs  │  │   Deepgram   │     │
│  │              │  │              │  │              │  │              │     │
│  │ • PostgreSQL │  │ • Claude     │  │ • TTS API    │  │ • STT API    │     │
│  │ • Realtime   │  │   Opus 4.5   │  │              │  │              │     │
│  │ • pgvector   │  │ • Tool use   │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

### 1. User Sends Message
```
User Input → useChat.sendMessage()
           → Optimistic UI update (temp message)
           → POST /api/chat
           → Save to csva_messages
           → Publish to QStash
           → Return "queued" status
```

### 2. Async Processing (Webhook)
```
QStash → POST /api/qstash/webhook (signature verified)
       → Load conversation history from csva_messages
       → Retrieve relevant memories from csva_memories (vector search)
       → Call OpenRouter with tools
       → For each tool call:
           → Broadcast tool:started
           → Execute tool (knowledge_qa, web_search, web_fetch)
           → Broadcast tool:progress (0-100%)
           → Save to csva_tool_calls
           → Broadcast tool:completed
       → Stream response chunks via broadcast
       → Broadcast response:done
       → Save assistant message to csva_messages
       → Extract and store new memories
```

### 3. Real-time Updates (Frontend)
```
Supabase Realtime Channel (all events include turnId)
  ├── Broadcast: processing:started → Create new turn
  ├── Broadcast: tool:started       → Add tool card (spinner)
  ├── Broadcast: tool:progress      → Update progress bar
  ├── Broadcast: tool:completed     → Mark tool complete
  ├── Broadcast: response:chunk     → Append to streaming message
  ├── Broadcast: response:done      → Mark turn complete, trigger TTS
  ├── Postgres: csva_messages       → Add new messages (grouped by turn_id)
  └── Postgres: csva_tool_calls     → Merge tool results
```

## Turn-Based Model

A **Turn** groups one user message with its corresponding assistant response and tool calls:

```
Turn (turn_id: "turn_abc123")
├── User Message     → "What's the price for mega set lash?"
├── Tool Calls       → [knowledge_qa: "mega set lash price"]
└── Assistant Message → "The Mega Set Lash costs $150..."
```

### MessageTurn (Frontend Type)
```typescript
interface MessageTurn {
  id: string                    // turn_id
  sessionId: string
  createdAt: string
  userQuery: string             // User's question
  toolCalls: TurnToolCall[]     // Tool executions
  assistantResponse?: string    // Final response
  streamingResponse?: string    // Live streaming text
  status: 'pending' | 'tools_running' | 'responding' | 'complete'
}
```

### Broadcast Events (all include turnId)
| Event | Payload |
|-------|---------|
| `processing:started` | `{ turnId, timestamp }` |
| `tool:started` | `{ turnId, toolCallId, toolName }` |
| `tool:progress` | `{ turnId, toolCallId, progress, message }` |
| `tool:completed` | `{ turnId, toolCallId, result }` |
| `response:chunk` | `{ turnId, text }` |
| `response:done` | `{ turnId, messageId }` |

## Database Schema

### csva_messages
| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID auto-generated or text) |
| session_id | text | Session identifier |
| turn_id | text | Groups user + assistant messages into a turn |
| role | text | 'user' or 'assistant' |
| content | text | Message content |
| tool_calls | text[] | Array of tool call IDs |
| created_at | timestamptz | Timestamp |

### csva_tool_calls
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto-generated) |
| tool_call_id | text | Tool call ID from LLM |
| session_id | text | Session identifier |
| message_id | text | FK to csva_messages.id (the assistant message) |
| tool_name | text | knowledge_qa, web_search, web_fetch |
| input | jsonb | Tool input parameters |
| output | jsonb | Tool execution result |
| duration_ms | int | Execution time |
| created_at | timestamptz | Timestamp |

### csva_memories
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | text | Session identifier |
| content | text | Memory content |
| category | text | Memory category |
| embedding | vector(1536) | OpenAI embedding |
| created_at | timestamptz | Timestamp |

## Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| knowledge_qa | Answer Rainie Beauty questions | csva_memories (vector search) |
| web_search | Search the web | Firecrawl API |
| web_fetch | Fetch webpage content | Firecrawl API |

## Key Design Decisions

### Async Queue Processing
Messages are queued via QStash rather than processed synchronously. This prevents timeouts on long LLM calls and tool executions, and provides automatic retry on failure.

### Realtime Broadcast vs Database
- **Broadcast**: Ephemeral events (tool progress, response chunks) - no persistence needed
- **Database + Postgres Changes**: Persistent data (messages, tool results) - triggers UI updates via realtime subscription

### Optimistic UI
User messages appear immediately in the UI before the API call completes. The temp message is functionally equivalent to the DB message.

### Turn-Based Model
Messages are grouped into turns using `turn_id`. Each turn contains one user message and one assistant response, plus any tool calls. This enables:
- Correct rendering order (user → tools → assistant)
- Real-time updates scoped to the active turn
- Clean state management in the frontend

### Memory System
Uses pgvector for semantic search. Memories are extracted from conversations and retrieved based on relevance to current query.

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Message ingestion
│   │   ├── qstash/webhook/route.ts # Async processing
│   │   └── voice/
│   │       ├── input/route.ts      # STT endpoint
│   │       └── output/route.ts     # TTS endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx       # Main chat wrapper
│   │   ├── MessageList.tsx         # Message + tool rendering
│   │   └── ChatInput.tsx           # Text input
│   └── voice/
│       └── VoiceButton.tsx         # Push-to-talk
├── hooks/
│   ├── useChat.ts                  # Message state + API
│   ├── useRealtimeEvents.ts        # Supabase realtime
│   └── useVoice.ts                 # STT/TTS integration
├── lib/
│   ├── supabase/                   # DB clients
│   ├── openrouter/                 # LLM client
│   ├── elevenlabs/                 # TTS client
│   ├── qstash/                     # Queue client
│   ├── memory/                     # Vector memory
│   └── weave/                      # Observability
└── tools/
    ├── definitions.ts              # Tool schemas
    ├── knowledgeQA.ts              # Knowledge base search
    ├── webSearch.ts                # Web search
    ├── webFetch.ts                 # Web fetch
    └── index.ts                    # Tool executor
```
