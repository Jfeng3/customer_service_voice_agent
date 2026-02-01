// Script to ingest knowledge into csva_memories
// Run with: npx tsx scripts/ingest-knowledge.ts

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

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
  console.log(`Generating embedding for: "${content.substring(0, 50)}..."`)
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

// Rainie Beauty knowledge base
const RAINIE_BEAUTY_KNOWLEDGE = [
  {
    content: "Rainie Beauty is a professional beauty salon that offers luxury hair styling, makeup artistry, skincare treatments and more. We transform your natural beauty and enhance your confidence.",
    category: "about"
  },
  {
    content: "Rainie Beauty offers professional hair styling services including haircuts, coloring, highlights, balayage, keratin treatments, and hair extensions. Our stylists are trained in the latest techniques.",
    category: "services"
  },
  {
    content: "Rainie Beauty provides makeup artistry services for weddings, special events, photoshoots, and everyday glam. We use high-quality products to create looks that last all day.",
    category: "services"
  },
  {
    content: "Rainie Beauty offers skincare treatments including facials, chemical peels, microdermabrasion, and anti-aging treatments. Our estheticians customize treatments for your skin type.",
    category: "services"
  },
  {
    content: "Rainie Beauty provides nail services including manicures, pedicures, gel nails, acrylic nails, and nail art. We use premium products for long-lasting results.",
    category: "services"
  },
  {
    content: "Rainie Beauty offers bridal packages that include hair styling, makeup, and skincare prep for your wedding day. We also offer services for the bridal party.",
    category: "services"
  },
  {
    content: "To book an appointment at Rainie Beauty, you can call us, book online through our website, or send us a message on social media. We recommend booking in advance for weekends and special events.",
    category: "booking"
  },
  {
    content: "Rainie Beauty is located in a convenient location with easy parking. We offer a relaxing and luxurious atmosphere for all our clients.",
    category: "location"
  },
  {
    content: "Rainie Beauty uses only premium, professional-grade beauty products. We carry top brands for hair care, skincare, and makeup that are also available for purchase.",
    category: "products"
  },
  {
    content: "Rainie Beauty's team consists of experienced and certified beauty professionals who regularly attend training to stay updated on the latest trends and techniques.",
    category: "team"
  }
]

async function ingestRainieBeauty() {
  console.log('='.repeat(50))
  console.log('Rainie Beauty Knowledge Ingestion')
  console.log('='.repeat(50))
  console.log(`\nIngesting ${RAINIE_BEAUTY_KNOWLEDGE.length} knowledge entries...\n`)

  let stored = 0
  for (const entry of RAINIE_BEAUTY_KNOWLEDGE) {
    try {
      await storeKnowledge(entry.content, {
        source: 'https://www.rainiebeauty.com/',
        category: entry.category,
        business: 'Rainie Beauty'
      })
      stored++
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300))
    } catch (error) {
      console.error(`  ✗ Error:`, error)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`Done! Stored ${stored}/${RAINIE_BEAUTY_KNOWLEDGE.length} knowledge entries`)
  console.log('='.repeat(50))
}

ingestRainieBeauty()
