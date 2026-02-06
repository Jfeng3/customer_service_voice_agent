import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { publishChatMessage } from '@/lib/qstash/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { ChatRequest, ChatResponse } from '@/types/chat'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, turnId } = body

    // Generate or use provided sessionId
    const sessionId = body.sessionId || nanoid()

    // Generate turnId if not provided
    const resolvedTurnId = turnId || `turn_${nanoid()}`

    if (!message || typeof message !== 'string') {
      return NextResponse.json<ChatResponse>(
        { status: 'error', sessionId, error: 'Message is required' },
        { status: 400 }
      )
    }

    // Save user message to database with UUID id and turn_id for grouping
    await supabaseAdmin.from('csva_messages').insert({
      session_id: sessionId,
      turn_id: resolvedTurnId,
      role: 'user',
      content: message,
    })

    // Publish to QStash for async processing
    await publishChatMessage(sessionId, message, resolvedTurnId)

    return NextResponse.json<ChatResponse>({
      status: 'queued',
      sessionId,
      turnId: resolvedTurnId,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json<ChatResponse>(
      {
        status: 'error',
        sessionId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
