import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { supabaseAdmin, broadcastEvent } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter/client'
import { executeTool, toolDefinitions } from '@/tools'
import { getMemoryContext, extractAndStoreMemories } from '@/lib/memory/client'
import type { Message } from '@/types/chat'

interface WebhookPayload {
  sessionId: string
  message: string
  timestamp: number
}

async function handler(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()
    const { sessionId, message } = payload

    // 1. Load conversation history from Supabase
    const { data: historyData } = await supabaseAdmin
      .from('csva_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const messages: Message[] = historyData || []

    // Convert to OpenRouter format
    const openRouterMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // 2. Retrieve relevant memories for context
    let memoryContext = ''
    try {
      memoryContext = await getMemoryContext({
        query: message,
        sessionId,
        maxMemories: 5,
      })
      if (memoryContext) {
        console.log('Retrieved memory context:', memoryContext)
      }
    } catch (error) {
      console.error('Memory retrieval error:', error)
      // Continue without memories if retrieval fails
    }

    // 3. Call OpenRouter with tool support
    let assistantResponse = ''
    const usedToolCallIds: string[] = []

    try {
      const result = await callOpenRouter({
        messages: openRouterMessages,
        tools: toolDefinitions,
        sessionId,
        memoryContext,
        onToolStart: async (toolName, toolCallId) => {
          await broadcastEvent(sessionId, 'tool:started', {
            toolName,
            toolCallId,
          })
        },
        onToolProgress: async (toolName, toolCallId, progress, message) => {
          await broadcastEvent(sessionId, 'tool:progress', {
            toolName,
            toolCallId,
            progress,
            message,
          })
        },
        onToolComplete: async (toolName, toolCallId, result) => {
          usedToolCallIds.push(toolCallId)
          await broadcastEvent(sessionId, 'tool:completed', {
            toolName,
            toolCallId,
            result,
          })
        },
        onResponseChunk: async (text) => {
          assistantResponse += text
          await broadcastEvent(sessionId, 'response:chunk', { text })
        },
        executeTool,
      })

      assistantResponse = result.content
    } catch (error) {
      console.error('OpenRouter error:', error)
      assistantResponse = 'Sorry, I encountered an error processing your request.'
      await broadcastEvent(sessionId, 'response:chunk', {
        text: assistantResponse,
      })
    }

    // 3. Broadcast response done
    await broadcastEvent(sessionId, 'response:done', {
      messageId: `msg_${Date.now()}`,
    })

    // 4. Save assistant response to database
    await supabaseAdmin.from('csva_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantResponse,
      tool_calls: usedToolCallIds.length > 0 ? usedToolCallIds : null,
    })

    // 5. Extract and store memories from this conversation turn
    try {
      await extractAndStoreMemories({
        sessionId,
        userMessage: message,
        assistantResponse,
      })
    } catch (error) {
      console.error('Memory extraction error:', error)
      // Continue even if memory storage fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Wrap with QStash signature verification
export const POST = verifySignatureAppRouter(handler)
