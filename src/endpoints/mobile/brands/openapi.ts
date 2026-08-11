export const mobileBrandsPaths = {
  '/api/mobile/brands': {
    get: {
      summary: 'List brands for mobile catalog',
      description: 'Fetch a list of brands with optional category filtering.',
      tags: ['brands'],
      parameters: [
        { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter brands by category ID' },
      ],
      responses: {
        200: {
          description: 'Successful brand list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  docs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        logoUrl: { type: 'string', nullable: true },
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
  },
}
