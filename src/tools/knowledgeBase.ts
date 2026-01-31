// Knowledge base search tool

interface KnowledgeBaseResult {
  title: string
  content: string
  category: string
  relevance: number
}

// Mock knowledge base data
const knowledgeBase: KnowledgeBaseResult[] = [
  {
    title: 'Return Policy',
    content:
      'We offer a 30-day return policy for all unused items in original packaging. Returns must be initiated through our website or customer service. Refunds are processed within 5-7 business days after we receive the item.',
    category: 'policies',
    relevance: 0,
  },
  {
    title: 'Shipping Information',
    content:
      'Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available for an additional $9.99. Free shipping on orders over $50. International shipping is available to select countries.',
    category: 'policies',
    relevance: 0,
  },
  {
    title: 'Product Warranty',
    content:
      'All products come with a 1-year manufacturer warranty covering defects in materials and workmanship. Extended warranties are available for purchase. Warranty claims can be filed through our support portal.',
    category: 'policies',
    relevance: 0,
  },
  {
    title: 'Payment Methods',
    content:
      'We accept Visa, Mastercard, American Express, PayPal, and Apple Pay. All transactions are secured with SSL encryption. Payment plans are available for orders over $200.',
    category: 'policies',
    relevance: 0,
  },
  {
    title: 'Account Management',
    content:
      'You can manage your account settings, order history, and saved addresses through the My Account section. Password reset links are sent via email. Account deletion requests are processed within 48 hours.',
    category: 'procedures',
    relevance: 0,
  },
]

export async function knowledgeBaseSearch(
  query: string,
  category?: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ results: KnowledgeBaseResult[] }> {
  // Simulate search progress
  onProgress?.(10, 'Initializing search...')
  await sleep(200)

  onProgress?.(30, 'Searching knowledge base...')
  await sleep(300)

  // Simple keyword matching (in production, use vector search)
  const queryLower = query.toLowerCase()
  let results = knowledgeBase.map((item) => ({
    ...item,
    relevance: calculateRelevance(queryLower, item),
  }))

  onProgress?.(60, 'Ranking results...')
  await sleep(200)

  // Filter by category if provided
  if (category) {
    results = results.filter((item) => item.category === category)
  }

  // Sort by relevance and take top results
  results = results
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)

  onProgress?.(90, 'Preparing response...')
  await sleep(100)

  onProgress?.(100, 'Search complete')

  return { results }
}

function calculateRelevance(query: string, item: KnowledgeBaseResult): number {
  const titleLower = item.title.toLowerCase()
  const contentLower = item.content.toLowerCase()

  let score = 0

  // Check title match
  if (titleLower.includes(query)) {
    score += 10
  }

  // Check content match
  const words = query.split(' ')
  for (const word of words) {
    if (word.length > 2) {
      if (titleLower.includes(word)) score += 3
      if (contentLower.includes(word)) score += 1
    }
  }

  return score
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
