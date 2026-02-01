# Voice Customer Service Agent - Implementation Plan

## Overview
Build a voice-enabled customer service agent using:
- **Next.js** (App Router) - Full-stack framework
- **OpenRouter** - LLM API (default: claude-opus-4-5-20250514)
- **ElevenLabs** - Text-to-speech
- **QStash** - Event queue for async processing
- **Upstash Redis** - (暂不使用，后续可加缓存层)
- **Supabase Realtime** - WebSocket-based real-time events to frontend
- **Supabase Database** - Persistent storage for tool calls and messages
- **Vercel** - Deployment platform

## Architecture Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  /api/chat  │────▶│   QStash    │────▶│  /api/qstash│
│  (Voice In) │     │  (Publish)  │     │   (Queue)   │     │  /webhook   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                                           │
       │                                                           ▼
       │                                                    ┌─────────────┐
       │                                                    │  OpenRouter │
       │                                                    │  + Tools    │
       │                                                    └─────────────┘
       │                                                           │
       │◀─────────── Supabase Realtime (WebSocket) ────────────────┤
       │              (Tool Progress, Response Chunks)             │
       ▼                                                           ▼
┌─────────────┐                                             ┌─────────────┐
│  Supabase   │◀────────────────────────────────────────────│   Webhook   │
│  Realtime   │         Broadcast (实时事件)                 │  (publish)  │
└─────────────┘                                             └─────────────┘
       │                                                           │
       ▼                                                           ▼
┌─────────────┐                                             ┌─────────────┐
│  Supabase   │◀────────────────────────────────────────────│   INSERT    │
│  Database   │     csva_tool_calls, csva_messages          │  (persist)  │
└─────────────┘                                             └─────────────┘
```

## 核心概念解释

### 为什么需要 QStash 异步处理？

**问题**：LLM 调用可能需要 10-30 秒，Vercel Serverless 函数有执行时间限制，且用户不应该等待。

**解决方案**：
1. `/api/chat` 收到消息后，立即把任务"排队"到 QStash，然后返回 `{ status: 'queued', sessionId }`
2. 用户无需等待，可以继续操作
3. QStash 在后台调用 `/api/qstash/webhook` 处理消息
4. 处理结果通过 Supabase Realtime 推送给前端

```
用户发消息 → API 立即返回"收到" → 后台慢慢处理 → 结果通过 WebSocket 推送
```

### 数据存储策略

| 数据 | 存储位置 | 用途 |
|------|----------|------|
| 对话历史 | **Supabase csva_messages 表** | 持久化，用户刷新后可恢复 |
| 工具调用 | **Supabase csva_tool_calls 表** | 分析、调试、计费 |

```typescript
// Webhook 处理时
// 1. 从 Supabase 读取对话历史
const { data: history } = await supabase
  .from('csva_messages')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at')

// 2. 处理完成后写入 Supabase
await supabase.from('csva_messages').insert({
  session_id: sessionId,
  role: 'assistant',
  content: response
})
```

## 前端实时显示机制

### 核心原理：Supabase Realtime (传输) + React State (显示)

- **Supabase Realtime**：WebSocket 通道，负责把后端事件传到前端
- **React State**：收到事件后更新 state，触发 UI 重新渲染

### useRealtimeEvents Hook 实现

```typescript
// src/hooks/useRealtimeEvents.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ToolProgress {
  toolName: string
  status: 'started' | 'progress' | 'completed'
  progress: number // 0-100
  message?: string
}

export function useRealtimeEvents(sessionId: string) {
  const [toolProgress, setToolProgress] = useState<ToolProgress | null>(null)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const channel = supabase.channel(`session:${sessionId}`)
      // 工具进度事件
      .on('broadcast', { event: 'tool:started' }, ({ payload }) => {
        setToolProgress({ ...payload, status: 'started', progress: 0 })
      })
      .on('broadcast', { event: 'tool:progress' }, ({ payload }) => {
        setToolProgress({ ...payload, status: 'progress' })
      })
      .on('broadcast', { event: 'tool:completed' }, ({ payload }) => {
        setToolProgress({ ...payload, status: 'completed', progress: 100 })
      })
      // 流式响应事件
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

  return { toolProgress, streamingMessage, isComplete }
}
```

### 工具进度显示 (ToolProgressPanel)

在聊天界面旁边显示工具执行状态：

```typescript
// src/components/tools/ToolProgressPanel.tsx
export function ToolProgressPanel({ toolProgress }: { toolProgress: ToolProgress | null }) {
  if (!toolProgress) return null

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {toolProgress.status === 'completed' ? '✅' : '🔍'}
        <span>{toolProgress.toolName}</span>
      </div>

      {/* 进度条 */}
      <div className="mt-2 h-2 bg-gray-200 rounded">
        <div
          className="h-full bg-blue-500 rounded transition-all"
          style={{ width: `${toolProgress.progress}%` }}
        />
      </div>

      {toolProgress.message && (
        <p className="mt-1 text-sm text-gray-600">{toolProgress.message}</p>
      )}
    </div>
  )
}
```

**显示效果**：
- `tool:started` → 显示卡片 "🔍 knowledge_base_search"，进度条 0%
- `tool:progress` → 进度条更新到 30%、60%、90%...
- `tool:completed` → 显示 "✅ knowledge_base_search"，进度条 100%

### 流式响应显示 (MessageList)

像 ChatGPT 一样，文字逐个"打出来"：

```typescript
// src/components/chat/MessageList.tsx
export function MessageList({ messages, streamingMessage }: Props) {
  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 正在流式输出的消息 */}
      {streamingMessage && (
        <div className="p-3 bg-gray-100 rounded-lg">
          {streamingMessage}
          <span className="animate-pulse">▋</span> {/* 闪烁光标 */}
        </div>
      )}
    </div>
  )
}
```

**显示效果**：
- 收到第一个 `response:chunk` → 新增 AI 消息气泡
- 每收到一个 chunk → 文字追加，用户看到逐字出现
- 收到 `response:done` → 光标消失，消息完成

## Supabase Database Schema

### csva_tool_calls 表（存储工具调用记录）

```sql
CREATE TABLE csva_tool_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input JSONB,                    -- 工具输入参数
  output JSONB,                   -- 工具返回结果
  status TEXT DEFAULT 'started',  -- started | completed | failed
  duration_ms INTEGER,            -- 执行耗时
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 索引：按 session 查询
CREATE INDEX idx_csva_tool_calls_session ON csva_tool_calls(session_id);

-- 索引：按时间查询（用于分析）
CREATE INDEX idx_csva_tool_calls_created ON csva_tool_calls(created_at);
```

### csva_messages 表（存储对话历史）

```sql
CREATE TABLE csva_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,             -- user | assistant
  content TEXT NOT NULL,
  tool_calls UUID[],              -- 关联的 csva_tool_calls.id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csva_messages_session ON csva_messages(session_id);
CREATE INDEX idx_csva_messages_created ON csva_messages(created_at);
```

### 写入策略：批量写入（推荐）

工具完成后一次性写入，避免多次 DB 操作：

```typescript
// 工具执行
const startTime = Date.now()
const result = await executeTool(toolName, input)
const duration = Date.now() - startTime

// 一次性写入完整记录（不阻塞主流程）
supabase.from('csva_tool_calls').insert({
  session_id: sessionId,
  tool_name: toolName,
  input: input,
  output: result,
  status: 'completed',
  duration_ms: duration,
  completed_at: new Date().toISOString()
})  // 注意：不 await，异步写入

// 消息写入
await supabase.from('csva_messages').insert({
  session_id: sessionId,
  role: 'assistant',
  content: response,
  tool_calls: [toolCallId]
})
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── chat/route.ts              # 接收消息 → 发布到 QStash
│       ├── qstash/webhook/route.ts    # QStash 回调 → 处理消息 → 发布事件
│       └── voice/output/route.ts      # ElevenLabs TTS streaming
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx          # 主容器，组合所有组件
│   │   ├── MessageList.tsx            # 消息列表 + 流式显示
│   │   └── InputArea.tsx              # 输入框 + 发送按钮
│   ├── voice/
│   │   ├── VoiceInput.tsx             # 语音输入按钮
│   │   └── VoiceIndicator.tsx         # 语音状态指示器
│   └── tools/
│       ├── ToolProgressPanel.tsx      # 工具进度面板
│       └── ToolProgressItem.tsx       # 单个工具进度条
├── hooks/
│   ├── useChat.ts                     # 发送消息、管理消息列表
│   ├── useRealtimeEvents.ts           # Supabase Realtime 订阅
│   └── useVoice.ts                    # 语音输入/输出控制
├── lib/
│   ├── openrouter/client.ts           # OpenRouter API 客户端
│   ├── elevenlabs/client.ts           # ElevenLabs TTS 客户端
│   ├── qstash/client.ts               # QStash 发布客户端
│   ├── supabase/client.ts             # Supabase 浏览器客户端
│   └── supabase/server.ts             # Supabase 服务端客户端
├── tools/
│   ├── index.ts                       # 工具注册表 + 执行器
│   ├── definitions.ts                 # OpenRouter 工具 schema
│   ├── knowledgeBase.ts               # 知识库搜索工具
│   └── faqLookup.ts                   # FAQ 查询工具
└── types/
    ├── events.ts                      # 事件类型定义
    └── chat.ts                        # 聊天消息类型
```

## Implementation Steps

### Phase 1: Project Setup
1. Initialize Next.js with TypeScript and Tailwind
2. Install dependencies:
   - `@upstash/qstash` - Async job queue
   - `@supabase/supabase-js` - Realtime events + Database
   - `nanoid` - ID generation
3. Configure environment variables

### Phase 2: Supabase Setup (Realtime + Database)
1. Set up Supabase client for browser and server
2. Create `tool_calls` table and `messages` table (see schema above)
3. Create event types (`tool:started`, `tool:progress`, `tool:completed`, `response:chunk`, `response:done`)
4. Build `useRealtimeEvents` hook（订阅 + 更新 state）
5. Create `ToolProgressPanel` component（显示工具进度）
6. Implement streaming message display in `MessageList`

### Phase 3: QStash Integration
1. Set up `/api/chat` to publish messages to QStash with sessionId
2. Implement `/api/qstash/webhook` with signature verification
3. Implement retry logic for failed messages

### Phase 4: OpenRouter Integration
1. Create OpenRouter client with streaming support
2. Implement tool calling loop (detect tool calls → execute → continue)
3. Publish events to Supabase Realtime during processing:
   - Tool execution → `tool:started/progress/completed`
   - Response streaming → `response:chunk/done`
4. Default model: `anthropic/claude-opus-4-5-20250514`

### Phase 5: Tool System
1. Define tool schemas for OpenRouter
2. Implement `knowledge_base_search` tool with progress callbacks
3. Implement `faq_lookup` tool with progress callbacks
4. Progress callbacks publish to Supabase Realtime
5. Store tool calls in `tool_calls` table (input, output, duration_ms)

### Phase 6: Voice Integration
1. Implement `VoiceInput` using Web Speech API (browser-side STT)
2. Create `/api/voice/output` for ElevenLabs TTS streaming
3. Build `useVoice` hook for voice I/O orchestration
4. Add `VoiceIndicator` component for visual feedback

### Phase 7: Frontend UI Polish
1. Build `ChatContainer` combining all components
2. Style with Tailwind CSS
3. Add loading states and error handling
4. Mobile responsive design

## Environment Variables

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB

# QStash (Upstash)
QSTASH_TOKEN=xxx
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_xxx

# Supabase (Realtime + Database)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SECRET_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Complete Event Flow

```
1. 用户发送消息
   Browser → POST /api/chat { message, sessionId }

2. API 立即返回，任务入队
   /api/chat → QStash.publish({ sessionId, message })
   返回 { status: 'queued' }

3. 前端开始监听
   useRealtimeEvents(sessionId) → 订阅 Supabase channel

4. QStash 调用 Webhook
   QStash → POST /api/qstash/webhook

5. Webhook 处理
   a. 从 Supabase 读取对话历史
   b. 调用 OpenRouter
   c. 如果需要工具：
      - 发布 tool:started 到 Supabase Realtime
      - 执行工具，期间发布 tool:progress
      - 发布 tool:completed 到 Supabase Realtime
      - 异步写入 csva_tool_calls 表（不阻塞）
      - 将结果返回 OpenRouter 继续生成
   d. 流式响应：
      - 每个 chunk 发布 response:chunk 到 Supabase Realtime
      - 完成后发布 response:done
   e. 保存消息到 Supabase csva_messages 表

6. 前端实时更新
   - 收到 tool:* → setToolProgress() → ToolProgressPanel 更新
   - 收到 response:chunk → setStreamingMessage() → 文字逐个出现
   - 收到 response:done → 完成，可以播放 TTS
```

## Tasks

- [ ] Phase 1: Initialize Next.js project with TypeScript and Tailwind
- [ ] Phase 2: Create Supabase tables (csva_tool_calls, csva_messages)
- [ ] Phase 2: Set up Supabase Realtime and create useRealtimeEvents hook
- [ ] Phase 2: Create ToolProgressPanel and streaming message display
- [ ] Phase 3: Implement QStash integration
- [ ] Phase 4: Implement OpenRouter client with Supabase event publishing
- [ ] Phase 5: Implement tool system with progress callbacks + DB persistence
- [ ] Phase 6: Implement voice integration (Web Speech API + ElevenLabs)
- [ ] Phase 7: Build frontend UI and polish
