// Crawl website using Firecrawl and store in csva_memories
// Run with: npx tsx scripts/crawl-website.ts <url>

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Firecrawl from '@mendable/firecrawl-js'

// Load environment variables
config({ path: '.env.local' })

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

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

async function storeKnowledge(content: string, metadata: Record<string, unknown>) {
  console.log(`  Generating embedding for: "${content.substring(0, 50)}..."`)
  const embedding = await generateEmbedding(content)

  const { data, error } = await supabase
    .from('csva_memories')
    .insert({
      session_id: 'knowledge_base',
      content,
      embedding,
      memory_type: 'fact',
      importance: 0.9,
      metadata,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to store: ${error.message}`)
  }

  console.log(`  ✓ Stored with ID: ${data.id}`)
  return data.id
}

function chunkText(text: string, maxChunkSize: number = 800): string[] {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    if ((currentChunk + '\n\n' + trimmed).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmed
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

async function crawlAndStore(url: string) {
  console.log('='.repeat(50))
  console.log('Firecrawl Website Ingestion')
  console.log('='.repeat(50))
  console.log(`\nTarget URL: ${url}\n`)

  if (!FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY not set in .env.local')
    console.log('\nGet your API key at: https://firecrawl.dev')
    console.log('Add to .env.local: FIRECRAWL_API_KEY=your_key_here')
    process.exit(1)
  }

  try {
    // Initialize Firecrawl with v1 API
    const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY })

    // Crawl the website using v1 API
    console.log('Crawling website...')
    const crawlResult = await firecrawl.v1.crawlUrl(url, {
      limit: 10, // Limit pages to crawl
      scrapeOptions: {
        formats: ['markdown'],
      },
    })

    if (!crawlResult.success) {
      throw new Error(`Crawl failed: ${(crawlResult as any).error}`)
    }

    console.log(`\nCrawled ${crawlResult.data?.length || 0} pages\n`)

    let totalStored = 0

    // Process each page
    for (const page of crawlResult.data || []) {
      console.log(`\nProcessing: ${page.metadata?.title || page.metadata?.sourceURL}`)

      const content = page.markdown || ''
      if (!content || content.length < 50) {
        console.log('  Skipping (too short)')
        continue
      }

      // Chunk the content
      const chunks = chunkText(content)
      console.log(`  Split into ${chunks.length} chunks`)

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (chunk.length < 30) continue // Skip very short chunks

        try {
          await storeKnowledge(chunk, {
            source: page.metadata?.sourceURL || url,
            title: page.metadata?.title || 'Rainie Beauty',
            chunk_index: i,
            total_chunks: chunks.length,
            crawled_at: new Date().toISOString(),
          })
          totalStored++

          // Rate limiting
          await new Promise(r => setTimeout(r, 300))
        } catch (error) {
          console.error(`  ✗ Error storing chunk ${i}:`, error)
        }
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`Done! Stored ${totalStored} knowledge chunks`)
    console.log('='.repeat(50))

  } catch (error) {
    console.error('Crawl error:', error)
    process.exit(1)
  }
}

// Run with URL argument or default
const targetUrl = process.argv[2] || 'https://www.rainiebeauty.com/'
crawlAndStore(targetUrl)
