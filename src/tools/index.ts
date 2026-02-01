// Tool registry and executor

import { toolDefinitions } from './definitions'
import { webSearch } from './webSearch'
import { webFetch } from './webFetch'

export { toolDefinitions }

type ProgressCallback = (progress: number, message?: string) => void

// Tool executor - routes tool calls to their implementations
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<unknown> {
  switch (toolName) {
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

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
