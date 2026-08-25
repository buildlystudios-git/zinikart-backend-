export const mobileSearchPaths = {
  '/api/mobile/search': {
    get: {
      summary: 'Search products, brands, categories, and retailers',
      description: 'Search for active retailer product listings and retailer profiles matching a text query in title, brand, category, or retailer attributes.',
      tags: ['products'],
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          description: 'The search query string',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'isMasterTemplate',
          in: 'query',
          description: 'Set to true to search master templates instead of regular products',
          schema: {
            type: 'boolean',
          },
        },
        {
          name: 'status',
          in: 'query',
          description: 'Filter by product status (e.g. published or draft). Defaults to published.',
          schema: {
            type: 'string',
            enum: ['published', 'draft'],
            default: 'published'
          },
        },
      ],
      responses: {
        200: {
          description: 'Search results matching the query',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  products: {
                    type: 'array',
                    items: {
                      type: 'object',
                      description: 'List of matching retailer-listed products',
                    },
                  },
                  retailers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      description: 'List of matching retailer profiles',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
