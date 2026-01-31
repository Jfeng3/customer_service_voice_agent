import { supabaseAdmin } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

interface Memory {
  id: string
  content: string
  memory_type: string
  importance: number
  metadata: Record<string, unknown>
  similarity?: number
  created_at: string
}

interface StoreMemoryOptions {
  sessionId: string
  userId?: string
  content: string
  memoryType?: 'conversation' | 'fact' | 'preference' | 'instruction'
  importance?: number
  metadata?: Record<string, unknown>
}

/**
 * Generate embedding vector using OpenRouter's embedding API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Embedding API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Store a memory with its embedding
 */
export async function storeMemory(options: StoreMemoryOptions): Promise<Memory> {
  const {
    sessionId,
    userId,
    content,
    memoryType = 'conversation',
    importance = 0.5,
    metadata = {},
  } = options

  // Generate embedding for the content
  const embedding = await generateEmbedding(content)

  // Store in Supabase
  const { data, error } = await supabaseAdmin
    .from('csva_memories')
    .insert({
      session_id: sessionId,
      user_id: userId,
      content,
      embedding,
      memory_type: memoryType,
      importance,
      metadata,
    })
    .select('id, content, memory_type, importance, metadata, created_at')
    .single()

  if (error) {
    throw new Error(`Failed to store memory: ${error.message}`)
  }

  return data as Memory
}

/**
 * Search for relevant memories using semantic similarity
 */
export async function searchMemories(options: {
  query: string
  sessionId?: string
  userId?: string
  matchThreshold?: number
  matchCount?: number
}): Promise<Memory[]> {
  const {
    query,
    sessionId,
    userId,
    matchThreshold = 0.7,
    matchCount = 5,
  } = options

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query)

  // Search using the Supabase function
  const { data, error } = await supabaseAdmin.rpc('search_memories', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_session_id: sessionId || null,
    filter_user_id: userId || null,
  })

  if (error) {
    console.error('Memory search error:', error)
    return []
  }

  // Update accessed_at for retrieved memories
  if (data && data.length > 0) {
    const memoryIds = data.map((m: Memory) => m.id)
    await supabaseAdmin
      .from('csva_memories')
      .update({ accessed_at: new Date().toISOString() })
      .in('id', memoryIds)
  }

  return data as Memory[]
}

/**
 * Extract and store important information from a conversation turn
 */
export async function extractAndStoreMemories(options: {
  sessionId: string
  userId?: string
  userMessage: string
  assistantResponse: string
}): Promise<void> {
  const { sessionId, userId, userMessage, assistantResponse } = options

  // Store user message as conversation memory
  // Only store if it contains meaningful content (not just greetings)
  const meaningfulPatterns = [
    /\b(my|i am|i'm|i have|i need|i want|i like|i prefer|i work|i live)\b/i,
    /\b(name is|called|email|phone|address|company|job|role)\b/i,
    /\b(problem|issue|help|question|how do|can you|please)\b/i,
  ]

  const isMeaningful = meaningfulPatterns.some(pattern => pattern.test(userMessage))

  if (isMeaningful && userMessage.length > 20) {
    try {
      await storeMemory({
        sessionId,
        userId,
        content: `User said: ${userMessage}`,
        memoryType: 'conversation',
        importance: 0.6,
        metadata: { source: 'user_message' },
      })
    } catch (error) {
      console.error('Failed to store user message memory:', error)
    }
  }

  // Extract facts or preferences from the conversation
  const factPatterns = [
    { pattern: /my name is (\w+)/i, type: 'fact' as const, importance: 0.9 },
    { pattern: /i work at ([^.]+)/i, type: 'fact' as const, importance: 0.8 },
    { pattern: /i prefer ([^.]+)/i, type: 'preference' as const, importance: 0.7 },
    { pattern: /i like ([^.]+)/i, type: 'preference' as const, importance: 0.6 },
    { pattern: /my email is ([^\s]+)/i, type: 'fact' as const, importance: 0.9 },
  ]

  for (const { pattern, type, importance } of factPatterns) {
    const match = userMessage.match(pattern)
    if (match) {
      try {
        await storeMemory({
          sessionId,
          userId,
          content: match[0],
          memoryType: type,
          importance,
          metadata: { extracted: true, pattern: pattern.source },
        })
      } catch (error) {
        console.error('Failed to store extracted memory:', error)
      }
    }
  }
}

/**
 * Get memories formatted for LLM context
 */
export async function getMemoryContext(options: {
  query: string
  sessionId?: string
  userId?: string
  maxMemories?: number
}): Promise<string> {
  const { query, sessionId, userId, maxMemories = 5 } = options

  const memories = await searchMemories({
    query,
    sessionId,
    userId,
    matchCount: maxMemories,
    matchThreshold: 0.65,
  })

  if (memories.length === 0) {
    return ''
  }

  const memoryText = memories
    .map((m, i) => `${i + 1}. [${m.memory_type}] ${m.content}`)
    .join('\n')

  return `\n\nRelevant memories from previous conversations:\n${memoryText}\n`
}
