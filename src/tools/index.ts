// Tool registry and executor

import { toolDefinitions } from './definitions'
import { knowledgeBaseSearch } from './knowledgeBase'
import { faqLookup } from './faqLookup'
import { orderLookup } from './orderLookup'
import { webSearch } from './webSearch'

export { toolDefinitions }

type ProgressCallback = (progress: number, message?: string) => void

// Tool executor - routes tool calls to their implementations
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<unknown> {
  switch (toolName) {
    case 'knowledge_base_search':
      return knowledgeBaseSearch(
        args.query as string,
        args.category as string | undefined,
        onProgress
      )

    case 'faq_lookup':
      return faqLookup(args.topic as string, onProgress)

    case 'order_lookup':
      return orderLookup(args.orderId as string, onProgress)

    case 'web_search':
      return webSearch(
        args.query as string,
        args.maxResults as number | undefined,
        onProgress
      )

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
