// Web fetch tool - fetches and extracts content from URLs

interface WebFetchResponse {
  url: string
  title: string
  content: string
  success: boolean
  error?: string
}

type ProgressCallback = (progress: number, message?: string) => void

export async function webFetch(
  url: string,
  onProgress?: ProgressCallback
): Promise<WebFetchResponse> {
  onProgress?.(10, 'Validating URL...')

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        url,
        title: '',
        content: '',
        success: false,
        error: 'Only HTTP and HTTPS URLs are supported',
      }
    }
  } catch {
    return {
      url,
      title: '',
      content: '',
      success: false,
      error: 'Invalid URL format',
    }
  }

  onProgress?.(25, `Fetching ${parsedUrl.hostname}...`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CustomerServiceBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return {
        url,
        title: '',
        content: '',
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    onProgress?.(50, 'Downloading content...')

    const contentType = response.headers.get('content-type') || ''
    const html = await response.text()

    onProgress?.(75, 'Extracting text content...')

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : parsedUrl.hostname

    // Extract main content
    const content = extractTextContent(html)

    // Truncate if too long (keep first ~4000 chars for LLM context)
    const truncatedContent = content.length > 4000
      ? content.substring(0, 4000) + '...[truncated]'
      : content

    onProgress?.(100, 'Content extracted successfully')

    return {
      url,
      title,
      content: truncatedContent,
      success: true,
    }
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch URL',
    }
  }
}

/**
 * Extract readable text content from HTML
 */
function extractTextContent(html: string): string {
  // Remove script and style tags with their content
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  text = decodeHtmlEntities(text)

  // Normalize whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  // Remove excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n')

  return text
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&bull;': '•',
    '&hellip;': '…',
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char)
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))

  return result
}
