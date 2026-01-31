// Tool definitions for OpenRouter

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description:
        'Search the web for current information, news, or answers. Use this tool to find up-to-date information from the internet.',
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
]
