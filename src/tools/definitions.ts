// Tool definitions for OpenRouter

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'knowledge_base_search',
      description:
        'Search the knowledge base for information about products, policies, or procedures. Use this when the customer asks questions about company policies, product details, or how-to guides.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information',
          },
          category: {
            type: 'string',
            enum: ['products', 'policies', 'procedures', 'general'],
            description: 'Optional category to narrow down the search',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'faq_lookup',
      description:
        'Look up frequently asked questions and their answers. Use this for common questions about shipping, returns, payments, etc.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic or question to look up',
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'order_lookup',
      description:
        'Look up order status and details by order ID. Use this when customer asks about their order.',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID to look up',
          },
        },
        required: ['orderId'],
      },
    },
  },
]
