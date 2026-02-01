// Knowledge QA tool - searches Rainie Beauty knowledge base

import { supabaseAdmin } from '@/lib/supabase/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

interface KnowledgeResult {
  content: string
  category: string
  similarity: number
}

interface KnowledgeQAResponse {
  query: string
  results: KnowledgeResult[]
  message: string
}

type ProgressCallback = (progress: number, message?: string) => void

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
    throw new Error(`Embedding API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

export async function knowledgeQA(
  query: string,
  maxResults: number = 3,
  onProgress?: ProgressCallback
): Promise<KnowledgeQAResponse> {
  onProgress?.(10, 'Searching Rainie Beauty knowledge base...')

  try {
    // Generate embedding for the query
    onProgress?.(30, 'Processing your question...')
    const queryEmbedding = await generateEmbedding(query)

    // Search using the Supabase function
    onProgress?.(60, 'Finding relevant information...')
    const { data, error } = await supabaseAdmin.rpc('search_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Lower threshold for better recall
      match_count: maxResults,
      filter_session_id: 'knowledge_base', // Only search knowledge base, not conversation memories
    })

    if (error) {
      console.error('Knowledge search error:', error)
      return {
        query,
        results: [],
        message: 'Unable to search knowledge base at this time.',
      }
    }

    onProgress?.(90, 'Preparing answer...')

    const results: KnowledgeResult[] = (data || []).map((item: {
      content: string
      metadata: { category?: string }
      similarity: number
    }) => ({
      content: item.content,
      category: item.metadata?.category || 'general',
      similarity: Math.round(item.similarity * 100) / 100,
    }))

    onProgress?.(100, `Found ${results.length} relevant answers`)

    return {
      query,
      results,
      message: results.length > 0
        ? `Found ${results.length} relevant pieces of information about Rainie Beauty.`
        : 'No specific information found. Please contact Rainie Beauty directly for this question.',
    }
  } catch (error) {
    console.error('Knowledge QA error:', error)
    return {
      query,
      results: [],
      message: 'An error occurred while searching the knowledge base.',
    }
  }
}
