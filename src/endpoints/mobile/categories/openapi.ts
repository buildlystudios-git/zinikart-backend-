export const mobileCategoriesPaths = {
  '/api/mobile/categories': {
    get: {
      summary: 'List categories for mobile catalog',
      description: 'Fetch a flat list of categories.',
      tags: ['categories'],
      responses: {
        200: {
          description: 'Successful category list',
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
                        title: { type: 'string' },
                        slug: { type: 'string', nullable: true },
                        imageUrl: { type: 'string', nullable: true },
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
