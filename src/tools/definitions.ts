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
  {
    type: 'function' as const,
    function: {
      name: 'square_bookings',
      description:
        'Manage appointments at Rainie Beauty salon. Search for available slots, create/cancel bookings, list existing bookings, and list bookable team members.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'search_availability',
              'create_booking',
              'cancel_booking',
              'list_bookings',
              'list_team_members',
            ],
            description: 'The booking action to perform',
          },
          startAt: {
            type: 'string',
            description:
              'Start of time range (ISO 8601). Required for search_availability and create_booking.',
          },
          endAt: {
            type: 'string',
            description:
              'End of time range (ISO 8601). Required for search_availability.',
          },
          serviceVariationId: {
            type: 'string',
            description: 'Service variation ID to filter availability by',
          },
          teamMemberIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Team member IDs to filter availability by',
          },
          customerId: {
            type: 'string',
            description:
              'Customer ID. Required for create_booking, optional for list_bookings.',
          },
          appointmentSegments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                teamMemberId: { type: 'string' },
                serviceVariationId: { type: 'string' },
                durationMinutes: { type: 'number' },
              },
              required: ['teamMemberId', 'serviceVariationId'],
            },
            description:
              'Appointment segments. Required for create_booking.',
          },
          customerNote: {
            type: 'string',
            description: 'Optional note from the customer for create_booking',
          },
          bookingId: {
            type: 'string',
            description: 'Booking ID. Required for cancel_booking.',
          },
          bookingVersion: {
            type: 'number',
            description: 'Booking version for cancel_booking (optimistic concurrency)',
          },
          teamMemberId: {
            type: 'string',
            description: 'Filter list_bookings by team member',
          },
          startAtMin: {
            type: 'string',
            description: 'Filter list_bookings: minimum start time (ISO 8601)',
          },
          startAtMax: {
            type: 'string',
            description: 'Filter list_bookings: maximum start time (ISO 8601)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of bookings to return for list_bookings',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'square_customers',
      description:
        'Manage customer profiles at Rainie Beauty. Search for customers by email/phone/name, create new customers, get a customer by ID, or update customer details.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['search', 'create', 'get', 'update'],
            description: 'The customer action to perform',
          },
          emailAddress: {
            type: 'string',
            description: 'Customer email address (for search, create, or update)',
          },
          phoneNumber: {
            type: 'string',
            description: 'Customer phone number (for search, create, or update)',
          },
          givenName: {
            type: 'string',
            description: 'Customer first name (for search, create, or update)',
          },
          familyName: {
            type: 'string',
            description: 'Customer last name (for search, create, or update)',
          },
          customerId: {
            type: 'string',
            description: 'Customer ID. Required for get and update.',
          },
          note: {
            type: 'string',
            description: 'Note about the customer (for create or update)',
          },
          companyName: {
            type: 'string',
            description: 'Company name (for create or update)',
          },
          birthday: {
            type: 'string',
            description: 'Birthday in YYYY-MM-DD format (for create or update)',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'square_catalog',
      description:
        'Browse Rainie Beauty salon services, pricing, and catalog items. List all bookable services, get a specific item, or search by keyword.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list_services', 'get_item', 'search'],
            description: 'The catalog action to perform',
          },
          itemId: {
            type: 'string',
            description: 'Catalog item ID. Required for get_item.',
          },
          textFilter: {
            type: 'string',
            description: 'Search keyword. Required for search.',
          },
        },
        required: ['action'],
      },
    },
  },
]
