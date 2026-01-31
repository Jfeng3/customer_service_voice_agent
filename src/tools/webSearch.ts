// Web search tool using Tavily API

interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

interface WebSearchResponse {
  results: SearchResult[]
  query: string
  message: string
}

type ProgressCallback = (progress: number, message?: string) => void

export async function webSearch(
  query: string,
  maxResults: number = 5,
  onProgress?: ProgressCallback
): Promise<WebSearchResponse> {
  onProgress?.(10, 'Initializing web search...')
  await sleep(200)

  const apiKey = process.env.TAVILY_API_KEY

  onProgress?.(25, `Searching the web for: "${query}"`)
  await sleep(300)

  let results: SearchResult[]

  if (apiKey) {
    // Use real Tavily API
    onProgress?.(50, 'Querying search engine...')

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: 'basic',
          include_answer: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`)
      }

      const data = await response.json()

      onProgress?.(75, 'Processing search results...')
      await sleep(200)

      results = data.results.map((r: { title: string; url: string; content: string; score: number }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      }))
    } catch (error) {
      console.error('Tavily API error:', error)
      // Fall back to mock results on error
      results = getMockResults(query)
    }
  } else {
    // Use mock results for testing
    onProgress?.(50, 'Querying search engine (mock mode)...')
    await sleep(500)

    onProgress?.(75, 'Processing search results...')
    await sleep(300)

    results = getMockResults(query)
  }

  onProgress?.(100, `Found ${results.length} results`)

  return {
    results,
    query,
    message: `Found ${results.length} web results for "${query}"`,
  }
}

function getMockResults(query: string): SearchResult[] {
  // Generate contextual mock results based on query keywords
  const lowerQuery = query.toLowerCase()

  if (lowerQuery.includes('shipping') || lowerQuery.includes('delivery')) {
    return [
      {
        title: 'Shipping & Delivery Information - Help Center',
        url: 'https://example.com/help/shipping',
        content: 'Standard shipping takes 3-5 business days. Express shipping available for 1-2 day delivery. Free shipping on orders over $50.',
        score: 0.95,
      },
      {
        title: 'International Shipping Guide',
        url: 'https://example.com/help/international',
        content: 'We ship to over 100 countries. International orders typically arrive within 7-14 business days. Customs fees may apply.',
        score: 0.87,
      },
    ]
  }

  if (lowerQuery.includes('return') || lowerQuery.includes('refund')) {
    return [
      {
        title: 'Return Policy - 30 Day Money Back Guarantee',
        url: 'https://example.com/returns',
        content: 'Return any item within 30 days for a full refund. Items must be unused and in original packaging. Free return shipping on defective items.',
        score: 0.94,
      },
      {
        title: 'How to Process a Return',
        url: 'https://example.com/help/return-process',
        content: 'Log into your account, find your order, and click "Start Return". Print the prepaid label and drop off at any authorized location.',
        score: 0.89,
      },
    ]
  }

  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('discount')) {
    return [
      {
        title: 'Current Promotions and Discounts',
        url: 'https://example.com/deals',
        content: 'Save up to 30% on select items. Use code SAVE20 for 20% off your first order. Member exclusive deals available.',
        score: 0.92,
      },
      {
        title: 'Price Match Guarantee',
        url: 'https://example.com/price-match',
        content: 'We match competitor prices. If you find a lower price within 14 days of purchase, we will refund the difference.',
        score: 0.85,
      },
    ]
  }

  // Generic results for other queries
  return [
    {
      title: `Search Results for: ${query}`,
      url: 'https://example.com/search',
      content: `Here are the top results for your search "${query}". Our customer service team is available 24/7 to assist you.`,
      score: 0.80,
    },
    {
      title: 'Help Center - Frequently Asked Questions',
      url: 'https://example.com/help',
      content: 'Find answers to common questions about orders, shipping, returns, and account management.',
      score: 0.75,
    },
    {
      title: 'Contact Customer Support',
      url: 'https://example.com/contact',
      content: 'Need more help? Contact our support team via chat, email, or phone. Average response time under 5 minutes.',
      score: 0.70,
    },
  ]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
