// Tool registry and executor

import { toolDefinitions } from './definitions'
import { webSearch } from './webSearch'
import { webFetch } from './webFetch'
import { knowledgeQA } from './knowledgeQA'
import { squareBookings } from './squareBookings'
import { squareCustomers } from './squareCustomers'
import { squareCatalog } from './squareCatalog'

export { toolDefinitions }

type ProgressCallback = (progress: number, message?: string) => void

// Tool executor - routes tool calls to their implementations
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<unknown> {
  switch (toolName) {
    case 'knowledge_qa':
      return knowledgeQA(
        args.query as string,
        args.maxResults as number | undefined,
        onProgress
      )

    case 'web_search':
      return webSearch(
        args.query as string,
        args.maxResults as number | undefined,
        onProgress
      )

    case 'web_fetch':
      return webFetch(
        args.url as string,
        onProgress
      )

    case 'square_bookings':
      return squareBookings(
        args as unknown as Parameters<typeof squareBookings>[0],
        onProgress
      )

    case 'square_customers':
      return squareCustomers(
        args as unknown as Parameters<typeof squareCustomers>[0],
        onProgress
      )

    case 'square_catalog':
      return squareCatalog(
        args as unknown as Parameters<typeof squareCatalog>[0],
        onProgress
      )

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
