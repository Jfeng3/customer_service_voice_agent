import { nanoid } from 'nanoid'
import { supabaseAdmin } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = 'anthropic/claude-opus-4.5'

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface CallOpenRouterOptions {
  messages: { role: 'user' | 'assistant'; content: string }[]
  tools: ToolDefinition[]
  sessionId: string
  onToolStart?: (toolName: string, toolCallId: string) => Promise<void>
  onToolProgress?: (
    toolName: string,
    toolCallId: string,
    progress: number,
    message?: string
  ) => Promise<void>
  onToolComplete?: (
    toolName: string,
    toolCallId: string,
    result: unknown
  ) => Promise<void>
  onResponseChunk?: (text: string) => Promise<void>
  executeTool: (
    toolName: string,
    args: Record<string, unknown>,
    onProgress?: (progress: number, message?: string) => void
  ) => Promise<unknown>
}

interface OpenRouterResponse {
  choices: {
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }[]
}

export async function callOpenRouter(
  options: CallOpenRouterOptions
): Promise<{ content: string }> {
  const {
    messages,
    tools,
    sessionId,
    onToolStart,
    onToolProgress,
    onToolComplete,
    onResponseChunk,
    executeTool,
  } = options

  // Build messages array with system prompt
  const allMessages: Message[] = [
    {
      role: 'system',
      content: `You are a helpful customer service agent. Be concise, friendly, and helpful.

You have access to web_search to find current information from the internet. Use it when you need to look up information to answer the customer's question.`,
    },
    ...messages,
  ]

  let continueLoop = true
  let finalContent = ''

  while (continueLoop) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: allMessages,
        tools: tools.length > 0 ? tools : undefined,
        stream: false, // TODO: Enable streaming later
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()
    const choice = data.choices[0]
    const message = choice.message

    // Check if there are tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant message with tool calls
      allMessages.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls,
      })

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name
        const toolCallId = toolCall.id
        const args = JSON.parse(toolCall.function.arguments)

        // Notify tool start
        await onToolStart?.(toolName, toolCallId)

        const startTime = Date.now()

        // Execute tool with progress callback
        const result = await executeTool(toolName, args, (progress, progressMessage) => {
          onToolProgress?.(toolName, toolCallId, progress, progressMessage)
        })

        const duration = Date.now() - startTime

        // Notify tool complete
        await onToolComplete?.(toolName, toolCallId, result)

        // Store tool call in database
        const { error: toolCallError } = await supabaseAdmin.from('csva_tool_calls').insert({
          id: toolCallId,
          session_id: sessionId,
          tool_name: toolName,
          input: args,
          output: result as Record<string, unknown>,
          status: 'completed',
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        if (toolCallError) {
          console.error('Failed to save tool call:', toolCallError.message)
        }

        // Add tool result message
        allMessages.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        })
      }

      // Continue loop to get final response
      continueLoop = true
    } else {
      // No tool calls, this is the final response
      finalContent = message.content || ''
      continueLoop = false

      // Stream response chunks (for now, send as single chunk)
      if (onResponseChunk && finalContent) {
        await onResponseChunk(finalContent)
      }
    }
  }

  return { content: finalContent }
}
