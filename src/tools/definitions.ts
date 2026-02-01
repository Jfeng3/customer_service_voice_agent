// Tool definitions for OpenRouter

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'knowledge_qa',
      description:
        'Search the Rainie Beauty knowledge base to answer customer questions about services, booking, pricing, location, and policies. ALWAYS use this tool FIRST for any questions about Rainie Beauty before using web search.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The customer question or topic to search for in the Rainie Beauty knowledge base',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of relevant answers to return (default: 3)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description:
        'Search the web for current information, news, or answers. Use this tool when information is not available in the Rainie Beauty knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information on the web',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_fetch',
      description:
        'Fetch and read the content of a specific webpage URL. Use this after web_search to get detailed content from a page, or when the user provides a specific URL to read.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL of the webpage to fetch (must start with http:// or https://)',
          },
        },
        required: ['url'],
      },
    },
  },
]
